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

export async function notifyCertificateReady(orderId: string): Promise<void> {
  const [row] = await getDb()
    .select({ order: orders, user: users })
    .from(orders)
    .innerJoin(users, eq(users.sub, orders.userSub))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!row || row.order.status !== "posted" || !isCertificateOrder(row.order.itemName)) return;
  if (!row.user.slackId) return;

  const downloadUrl = appUrl(`/api/certificates/${row.order.id}`);
  const verifyUrl = appUrl(`/certificates/verify/${row.order.id}`);
  if (!downloadUrl || !verifyUrl) {
    console.warn("[certificates] APP_URL is not configured; certificate DM skipped");
    return;
  }

  const recipient = row.order.fullName?.trim() || row.user.name || "3AM maker";
  const message =
    "🏅 *Your 3AM Certificate is ready!*\n\n" +
    `Issued to: *${recipient.replace(/[&<>]/g, "")}*\n` +
    `Certificate ID: ` + "`3AM-" + row.order.id.slice(0, 8).toUpperCase() + "`\n\n" +
    `<${downloadUrl}|Download your certificate (SVG)>\n` +
    `<${verifyUrl}|Verify certificate authenticity>\n\n` +
    "Keep the original download; the verification page checks the certificate against the 3AM order record.";

  const sent = await sendSlackDm(row.user.slackId, message);
  if (!sent) console.warn("[certificates] certificate generated but Slack DM could not be delivered");
}
