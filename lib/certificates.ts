import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { sendSlackDm } from "@/lib/slack/notifications";

function appUrl(path: string): string | null {
  const configured = process.env.APP_URL?.trim();
  if (!configured || !path.startsWith("/") || path.startsWith("//")) return null;
  try {
    const base = new URL(configured);
    if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname))) return null;
    const url = new URL(path, base);
    return url.origin === base.origin ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isCertificateOrder(itemName: string): boolean {
  return itemName.toLowerCase().includes("certificate");
}

async function uploadPdfToDmChannel(
  token: string,
  channelId: string,
  pdfBytes: Uint8Array,
  filename: string,
  initialComment: string,
): Promise<boolean> {
  try {
    const urlRes = await fetch("https://slack.com/api/files.getUploadURLExternal", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ filename, length: pdfBytes.byteLength }),
      signal: AbortSignal.timeout(5000),
    });
    if (!urlRes.ok) return false;

    const { ok: urlOk, upload_url, file_id } = await urlRes.json() as {
      ok?: boolean;
      upload_url?: string;
      file_id?: string;
    };
    if (!urlOk || !upload_url || !file_id) return false;

    const putRes = await fetch(upload_url, {
      method: "POST",
      headers: { "Content-Type": "application/pdf" },
      body: new Uint8Array(pdfBytes),
      signal: AbortSignal.timeout(15000),
    });
    if (!putRes.ok) return false;

    const doneRes = await fetch("https://slack.com/api/files.completeUploadExternal", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        files: [{ id: file_id, title: filename }],
        channel_id: channelId,
        initial_comment: initialComment,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!doneRes.ok) return false;
    return Boolean(((await doneRes.json()) as { ok?: boolean }).ok);
  } catch (error) {
    console.warn("[certificates] Slack PDF upload failed", error);
    return false;
  }
}

export async function notifyCertificateReady(orderId: string): Promise<void> {
  const [row] = await getDb()
    .select({ order: orders, user: users })
    .from(orders)
    .innerJoin(users, eq(users.sub, orders.userSub))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!row || row.order.status !== "posted" || !isCertificateOrder(row.order.itemName) || !row.user.slackId) return;

  const downloadUrl = appUrl(`/api/certificates/${row.order.id}`);
  const verifyUrl = appUrl(`/certificates/verify/${row.order.id}`);
  if (!downloadUrl || !verifyUrl) {
    console.warn("[certificates] APP_URL is not configured; certificate DM skipped");
    return;
  }

  const recipient = (row.order.fullName?.trim() || row.user.name || "3AM maker").replace(/[&<>]/g, "");
  const certificateId = "3AM-" + row.order.id.slice(0, 8).toUpperCase();
  const baseMessage =
    "🏅 *Your 3AM Certificate is ready!*\n\n" +
    `Issued to: *${recipient}*\nCertificate ID: \`${certificateId}\`\n\n` +
    `<${verifyUrl}|Verify certificate authenticity>\n\n` +
    "Your personalized certificate is attached as a PDF. The verification page checks it against the 3AM order record.";

  let fileDelivered = false;
  const token = process.env.SLACK_BOT_TOKEN?.trim();

  if (token) {
    try {
      const pdfRes = await fetch(downloadUrl, {
        headers: { Accept: "application/pdf" },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (pdfRes.ok && pdfRes.headers.get("content-type")?.includes("application/pdf")) {
        const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
        const openRes = await fetch("https://slack.com/api/conversations.open", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({ users: row.user.slackId }),
          signal: AbortSignal.timeout(5000),
        });
        if (openRes.ok) {
          const { ok, channel } = await openRes.json() as {
            ok?: boolean;
            channel?: { id?: string };
          };
          if (ok && channel?.id) {
            fileDelivered = await uploadPdfToDmChannel(
              token,
              channel.id,
              pdfBytes,
              `${certificateId}.pdf`,
              baseMessage,
            );
          }
        }
      } else {
        console.warn("[certificates] PDF endpoint did not return a PDF", pdfRes.status);
      }
    } catch (error) {
      console.warn("[certificates] certificate PDF delivery failed", error);
    }
  }

  if (!fileDelivered) {
    const sent = await sendSlackDm(
      row.user.slackId,
      baseMessage + `\n\n<${downloadUrl}|Download your certificate (PDF)>`,
    );
    if (!sent) {
      console.warn("[certificates] certificate generated but Slack DM could not be delivered");
    }
  }
}
