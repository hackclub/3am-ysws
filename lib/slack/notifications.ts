import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { projects, users, webhookEvents } from "@/lib/db/schema";
import { missingForGrant } from "@/lib/grant";
import { getPickerProjects, formatHours } from "@/lib/hackatime/projects";
import { fetchAriStatus } from "@/lib/ari/status";
import type { Project } from "@/lib/db/schema";
import { dispatchBlocks, displayItemName, trackingGuideLines } from "@/lib/fulfilment/tracking";

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

export async function sendSlackDm(slackId: string, message: string, blocks?: Record<string, unknown>[]): Promise<boolean> {
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
    ...(blocks?.length ? { blocks } : {}),
  });
  return Boolean(sent?.ts);
}

export async function notifySlackMemberJoined(slackId: string): Promise<boolean> {
  const projectsUrl = appUrl("/dash/projects");
  const ordersUrl = appUrl("/dash/orders");
  const links = [
    projectsUrl ? `\n• <${projectsUrl}|Open your project dashboard>` : "",
    ordersUrl ? `\n• <${ordersUrl}|Check the rewards shop and your orders>` : "",
  ].filter(Boolean).join("");

  const message =
    "👋 *Welcome to 3AM!*\n\n" +
    "Glad you’re here. The goal is simple: build something, ship it, and share your progress.\n\n" +
    "*Your quick start*\n" +
    "• Read the current program rules before starting.\n" +
    "• Pick a small, achievable project and keep your work moving.\n" +
    "• Track your work as required by the program, then submit when it’s ready.\n" +
    "• If you’re stuck, ask the team in #3am-coorgs.\n" +
    links +
    "\n\nNo pressure to make something huge on day one. Ship the first version. 🚀";

  return sendSlackDm(slackId, message);
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
  tracking?: string | null;
}): Promise<void> {
  const name = escapeSlackText(input.makerName || "there");
  const item = escapeSlackText(displayItemName(input.itemName));
  // Shop orders ship with DTDC, so the guide points to DTDC's tracking page.
  const tracking = input.tracking?.trim() ? `\n\n${trackingGuideLines(input.tracking, null, escapeSlackText).join("\n")}` : "";
  const url = appUrl("/dash/orders");
  const link = url ? `\n\n<${url}|View your orders>` : "";
  const message = `📦 *Your 3AM order has been dispatched!*\nHey ${name} — *${item}* has been marked as posted.${tracking}${link}\n\nIf you have questions, DM the 3AM team in Hack Club Slack.`;

  try {
    await sendSlackDm(input.slackId, message, dispatchBlocks(message, input.tracking, null));
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

function organizerSlackIds(): string[] {
  const configured = [
    process.env.SLACK_ORDER_DIGEST_USER_ID,
    ...(process.env.ORGANIZER_SLACK_IDS ?? "").split(","),
  ];
  return [...new Set(configured.map((value) => value?.trim()).filter((value): value is string => typeof value === "string" && /^[UW][A-Z0-9]+$/.test(value)))];
}

export async function notifyNewProjectSubmission(projectId: string): Promise<void> {
  // New-project alerts go to the full 3AM second-pass review team by DM.
  const recipients = [
    "U0A1984JZBM", // Hridhaan
    "U089A0UH848", // Aastha Khanal
  ];

  try {
    const [row] = await getDb()
      .select({ project: projects, maker: users })
      .from(projects)
      .innerJoin(users, eq(users.sub, projects.userSub))
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!row || !row.project.submittedAt) return;

    const selectedNames = new Set(row.project.hackatimeProjects);
    const trackedProjects = await getPickerProjects(row.maker);
    const trackedSeconds = (trackedProjects ?? [])
      .filter((project) => selectedNames.has(project.key))
      .reduce((total, project) => total + project.seconds, 0);
    const hours = trackedProjects
      ? formatHours(trackedSeconds)
      : "Unavailable (Hackatime lookup failed)";
    const maker = escapeSlackText(row.maker.name || "Unknown maker");
    const title = escapeSlackText(row.project.title);
    const description = row.project.description?.trim()
      ? escapeSlackText(row.project.description.trim().slice(0, 500))
      : "No description provided.";
    const repo = row.project.repoUrl ? `<${row.project.repoUrl}|Repository>` : "";
    const demo = row.project.demoUrl ? `<${row.project.demoUrl}|Demo>` : "";
    const makerMention = /^[UW][A-Z0-9]+$/.test(row.maker.slackId)
      ? `<@${row.maker.slackId}>`
      : maker;
    const projectUrl = appUrl("/dash/projects");
    // Mention the complete reviewer team in each individual DM.
    const reviewerPings = recipients.map((slackId) => `<@${slackId}>`).join(" ");
    const lines = [
      `🆕 *New project submitted to 3AM* — ${reviewerPings}`,
      `*Project:* ${title}`,
      `*Maker:* ${maker} (${makerMention})`,
      `*Track:* ${row.project.track === "hardware" ? "Hardware" : "Software"}`,
      `*Hackatime:* ${escapeSlackText(hours)}`,
      `*Description:* ${description}`,
      [repo, demo].filter(Boolean).join(" · "),
      projectUrl ? `<${projectUrl}|Open 3AM dashboard>` : "",
    ].filter(Boolean);
    const blocks: Record<string, unknown>[] = [
      { type: "section", text: { type: "mrkdwn", text: lines.join("\n") } },
    ];

    const thumbnail = row.project.thumbnailUrl;
    if (thumbnail) {
      try {
        const url = new URL(thumbnail);
        if (url.protocol === "https:") {
          blocks.push({
            type: "image",
            image_url: url.toString(),
            alt_text: `Screenshot of ${row.project.title}`.slice(0, 200),
          });
        }
      } catch {
        // Ignore malformed screenshot URLs; the DM still goes out.
      }
    }

    await Promise.all(recipients.map(async (slackId) => {
      const opened = await slackApi("conversations.open", { users: slackId });
      const channel = opened?.channel?.id;
      if (!channel) return;
      await slackApi("chat.postMessage", {
        channel,
        text: `New 3AM project: ${row.project.title} — ${row.maker.name} — ${reviewerPings}`,
        blocks,
        mrkdwn: true,
        unfurl_links: false,
        unfurl_media: false,
      });
    }));
  } catch {
    console.warn("[slack] could not prepare new-project DM; submission was saved");
  }
}

const SECOND_PASS_REVIEWERS = [
  "U0A1984JZBM", // Hridhaan
  "U089A0UH848", // Aastha Khanal
];

export async function notifyAriSecondPass(projectId: string): Promise<void> {
  try {
    const status = await fetchAriStatus(projectId);
    if (status?.phase !== "second_pass") return;

    // Record a deterministic notification event so duplicate ARI webhooks do
    // not repeatedly alert the same reviewers for the same ARI version.
    const deliveryId = `notification:second-pass:${projectId}:${status.version ?? 1}`;
    const [claimed] = await getDb()
      .insert(webhookEvents)
      .values({
        deliveryId,
        projectId,
        event: "notification.second_pass",
        payload: { phase: "second_pass", version: status.version ?? null },
      })
      .onConflictDoNothing({ target: webhookEvents.deliveryId })
      .returning({ deliveryId: webhookEvents.deliveryId });
    if (!claimed) return;

    const [row] = await getDb()
      .select({ project: projects, maker: users })
      .from(projects)
      .innerJoin(users, eq(users.sub, projects.userSub))
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!row) return;

    const projectName = escapeSlackText(row.project.title);
    const makerName = escapeSlackText(row.maker.name || "Unknown maker");
    const projectUrl = appUrl("/dash/projects");
    const message = [
      "🚨 *New project entered 3AM second pass*",
      "*Please check the ARI fraud queue — a new project is waiting.*",
      `*Project:* ${projectName}`,
      `*Maker:* ${makerName}`,
      `*Track:* ${row.project.track === "hardware" ? "Hardware" : "Software"}`,
      row.project.repoUrl ? `*Repository:* <${row.project.repoUrl}|Open repo>` : "",
      projectUrl ? `<${projectUrl}|Open 3AM dashboard>` : "",
    ].filter(Boolean).join("\n");

    const results = await Promise.all(
      SECOND_PASS_REVIEWERS.map((slackId) => sendSlackDm(slackId, message)),
    );
    if (results.some((sent) => !sent)) {
      console.warn("[slack] one or more second-pass reviewer DMs could not be delivered");
    }
  } catch {
    console.warn("[slack] could not prepare ARI second-pass notification");
  }
}

export async function notifyUnifiedProjectApproved(projectId: string): Promise<void> {
  try {
    const [row] = await getDb()
      .select({ project: projects, maker: users })
      .from(projects)
      .innerJoin(users, eq(users.sub, projects.userSub))
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!row || row.project.decision !== "approved") return;

    const missing = missingForGrant(row.maker);
    const unifiedUrl = appUrl("/dash/unified");
    const settingsUrl = appUrl("/dash/settings");
    const status = missing.length > 0
      ? `⚠️ *Held for missing maker details:* ${escapeSlackText(missing.join(", "))}`
      : "✅ Maker details look complete; ready for the Unified workflow.";
    const message = [
      "🆕 *New approved project in 3AM Unified*",
      `*Project:* ${escapeSlackText(row.project.title)}`,
      `*Maker:* ${escapeSlackText(row.maker.name || "Unknown maker")}`,
      status,
      unifiedUrl ? `<${unifiedUrl}|Open Unified submissions>` : "",
      missing.length > 0 && settingsUrl ? `Maker settings: <${settingsUrl}|open settings>` : "",
    ].filter(Boolean).join("\n");

    await Promise.all(organizerSlackIds().map((slackId) => sendSlackDm(slackId, message)));
  } catch {
    console.warn("[slack] could not prepare new Unified project notification");
  }
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
    `📬 <@${slackId}> *3AM order digest* — ${createdCount} new, ${shippedCount} shipped`,
    ...details,
    orderLink,
  ]
    .filter(Boolean)
    .join("\n\n");

  return sendSlackDm(slackId, message);
}


export async function sendMissingDetailsReminder(projectId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ project: projects, maker: users })
    .from(projects)
    .innerJoin(users, eq(users.sub, projects.userSub))
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!row || row.project.decision !== "approved") return false;
  const missing = missingForGrant(row.maker);
  if (missing.length === 0 || !row.maker.slackId) return false;

  const opened = await slackApi("conversations.open", { users: row.maker.slackId });
  const channel = opened?.channel?.id;
  if (!channel) return false;

  const settingsUrl = appUrl("/dash/settings");
  const missingText = missing.join(", ");
  const sent = await slackApi("chat.postMessage", {
    channel,
    text: `⚠️ Missing details for *${escapeSlackText(row.project.title)}*. Please complete: ${escapeSlackText(missingText)}. ${settingsUrl ?? "https://3am.hackclub.com/dash/settings"}`,
    mrkdwn: true,
    unfurl_links: false,
    unfurl_media: false,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `Hey ${escapeSlackText(row.maker.name || "there")}! 👋\n\nWe are unable to send your project *${escapeSlackText(row.project.title)}* to HQ because some required details are missing.\n\n*Still needed:* ${escapeSlackText(missingText)}\n\nPlease fill these in ASAP in your <${settingsUrl ?? "https://3am.hackclub.com/dash/settings"}|3AM settings>.` } },
      { type: "actions", elements: [{ type: "button", action_id: "missing_details_done", text: { type: "plain_text", text: "Done — I've submitted my details" }, style: "primary", value: row.project.id }] },
    ],
    metadata: { event_type: "missing_details_reminder", event_payload: { projectId: row.project.id } },
  });
  return Boolean(sent?.ts);
}

export async function notifyMissingDetailsAcknowledged(input: {
  projectId: string;
  projectTitle: string;
  makerName: string;
  slackId: string;
}): Promise<void> {
  const recipients = (process.env.ORGANIZER_SLACK_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^[UW][A-Z0-9]+$/.test(value));
  const message = `✅ *Maker says their details are submitted*\n*${escapeSlackText(input.makerName)}* clicked Done for *${escapeSlackText(input.projectTitle)}* (project \`${input.projectId}\`).\n\nThis is an acknowledgement only — please verify the details before sending to HQ.`;
  await Promise.all(recipients.map((slackId) => sendSlackDm(slackId, message)));
}
