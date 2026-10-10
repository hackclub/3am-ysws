import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { Project } from "@/lib/db/schema";

type SlackApiResponse = {
  ok?: boolean;
  error?: string;
  channel?: { id?: string };
  ts?: string;
};

function escapeSlackText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function appUrl(path: string): string | null {
  const configured = process.env.APP_URL?.trim();
  if (!configured || !path.startsWith("/") || path.startsWith("//")) return null;

  try {
    const base = new URL(configured);
    if (
      (base.protocol !== "https:" && base.protocol !== "http:") ||
      base.username ||
      base.password ||
      (base.protocol !== "https:" && base.hostname !== "localhost" && base.hostname !== "127.0.0.1")
    ) return null;

    const url = new URL(path, base);
    return url.origin === base.origin ? url.toString() : null;
  } catch {
    return null;
  }
}

async function slackApi<T extends SlackApiResponse>(method: string, body: Record<string, unknown>): Promise<T | null> {
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  if (!token) {
    console.warn("[slack] notification skipped: SLACK_BOT_TOKEN is not configured");
    return null;
  }

  try {
    const response = await fetch(`https://slack.com/api/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      console.warn(`[slack] ${method} failed with HTTP ${response.status}`);
      return null;
    }

    const result = (await response.json()) as T;
    if (!result.ok) {
      console.warn(`[slack] ${method} failed: ${result.error ?? "unknown_error"}`);
      return null;
    }
    return result;
  } catch {
    console.warn(`[slack] ${method} request failed`);
    return null;
  }
}

export async function sendSlackDm(slackId: string, message: string): Promise<boolean> {
  if (!/^[UW][A-Z0-9]+$/.test(slackId)) {
    console.warn("[slack] notification skipped: stored Slack user ID is invalid");
    return false;
  }

  const opened = await slackApi("conversations.open", { users: slackId });
  const channel = opened?.channel?.id;
  if (!channel) return false;

  const sent = await slackApi("chat.postMessage", {
    channel,
    text: message,
    mrkdwn: true,
    unfurl_links: false,
    unfurl_media: false,
  });
  return Boolean(sent?.ts);
}

export async function notifyProjectDecision(project: Project): Promise<void> {
  try {
    if (!project.decision || project.decision === "withdrawn") return;

    const [maker] = await getDb()
      .select({ name: users.name, slackId: users.slackId })
      .from(users)
      .where(eq(users.sub, project.userSub))
      .limit(1);
    if (!maker?.slackId) return;

    const name = escapeSlackText(maker.name || "there");
    const title = escapeSlackText(project.title);
    const url = appUrl("/dash/projects");
    const link = url ? `\n\n<${url}|Open your projects>` : "";

    let message: string;
    switch (project.decision) {
      case "approved": {
        const hours =
          project.approvedMinutes == null
            ? ""
            : `\nApproved time: *${(project.approvedMinutes / 60).toFixed(2)} hours*.`;
        message = `🌟 *Your 3AM project was approved!*\nHey ${name} — *${title}* has been approved.${hours}${link}\n\nKeep shipping, Team #3AM.`;
        break;
      }
      case "changes":
        message = `🛠️ *Changes requested on your 3AM project*\nHey ${name} — we need a few changes to *${title}*.\n\n*Reviewer feedback*\n${escapeSlackText(project.noteToMaker?.trim() || "Please open your project dashboard for details.")}${link}\n\nYou’ve got this, Team #3AM.`;
        break;
      case "rejected":
        message = `📋 *Update on your 3AM project*\nHey ${name} — *${title}* wasn’t approved this time.\n\n*Reviewer feedback*\n${escapeSlackText(project.noteToMaker?.trim() || "Please open your project dashboard for details.")}${link}\n\nThanks for building with 3AM, Team #3AM.`;
        break;
      default:
        return;
    }

    await sendSlackDm(maker.slackId, message);
  } catch {
    console.warn("[slack] could not prepare project decision notification; decision was saved");
  }
}

export async function notifyOrderFulfilled(input: {
  slackId: string;
  makerName: string;
  itemName: string;
}): Promise<void> {
  const name = escapeSlackText(input.makerName || "there");
  const item = escapeSlackText(input.itemName);
  const url = appUrl("/dash/orders");
  const link = url ? `\n\n<${url}|View your orders>` : "";
  const message = `📦 *Your 3AM fulfilment is marked complete!*\nHey ${name} — *${item}* has been marked as fulfilled.${link}\n\nIf you have questions, DM the 3AM team in Hack Club Slack.`;

  try {
    await sendSlackDm(input.slackId, message);
  } catch {
    console.warn("[slack] could not prepare fulfilment notification; order was updated");
  }
}


export type SlackOrderDigestEvent = {
  id: number;
  orderId: string;
  eventType: "created" | "shipped";
  payload: Record<string, unknown>;
  createdAt: Date;
};

function payloadText(payload: Record<string, unknown>, key: string, fallback: string): string {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function notifyOrderDigest(
  slackId: string,
  events: SlackOrderDigestEvent[],
): Promise<boolean> {
  if (events.length === 0) return true;

  const grouped = new Map<
    string,
    { makerName: string; itemName: string; cost: string; created: boolean; shipped: boolean; tracking: string | null }
  >();

  for (const event of events) {
    const payload = event.payload ?? {};
    const current = grouped.get(event.orderId) ?? {
      makerName: payloadText(payload, "makerName", "Unknown maker"),
      itemName: payloadText(payload, "itemName", "Unknown reward"),
      cost: String(payload.cost ?? "unknown"),
      created: false,
      shipped: false,
      tracking: null,
    };

    if (event.eventType === "created") current.created = true;
    if (event.eventType === "shipped") {
      current.shipped = true;
      const tracking = payload.tracking;
      current.tracking = typeof tracking === "string" && tracking.trim() ? tracking.trim() : null;
      current.makerName = payloadText(payload, "makerName", current.makerName);
      current.itemName = payloadText(payload, "itemName", current.itemName);
      current.cost = String(payload.cost ?? current.cost);
    }
    grouped.set(event.orderId, current);
  }

  const createdCount = events.filter((event) => event.eventType === "created").length;
  const shippedCount = events.filter((event) => event.eventType === "shipped").length;
  const url = appUrl("/dash/orders");
  const orderLink = url ? `\n<${url}|Open orders dashboard>` : "";

  const details = [...grouped.entries()].map(([orderId, order]) => {
    const statuses = [
      order.created ? "🛒 New order" : "",
      order.shipped
        ? `📦 Shipped${order.tracking ? ` — tracking: ${escapeSlackText(order.tracking)}` : ""}`
        : "",
    ].filter(Boolean);
    return [
      `• *${escapeSlackText(order.itemName)}* — ${escapeSlackText(order.makerName)} — ${escapeSlackText(order.cost)} beans`,
      `  Order \`${escapeSlackText(orderId.slice(0, 8))}\` · ${statuses.join(" · ")}`,
    ].join("\n");
  });

  const message = [
    `📬 *3AM order digest* — ${createdCount} new, ${shippedCount} shipped`,
    ...details,
    orderLink,
  ]
    .filter(Boolean)
    .join("\n\n");

  return sendSlackDm(slackId, message);
}
