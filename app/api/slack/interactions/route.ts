import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";
import { SHOW_TRACKING_ACTION, TRACK_PAGE_ACTION, isTrackingId } from "@/lib/fulfilment/tracking";
import { notifyMissingDetailsAcknowledged } from "@/lib/slack/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_CLOCK_SKEW_SECONDS = 60 * 5;

function validSignature(rawBody: string, timestamp: string | null, signature: string | null, secret: string) {
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  const seconds = Number(timestamp);
  if (!Number.isSafeInteger(seconds) || Math.abs(Math.floor(Date.now() / 1000) - seconds) > MAX_CLOCK_SKEW_SECONDS) return false;
  const expected = `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${rawBody}`).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.SLACK_SIGNING_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Slack interactions are not configured" }, { status: 503 });

  const rawBody = await request.text();
  if (!validSignature(rawBody, request.headers.get("x-slack-request-timestamp"), request.headers.get("x-slack-signature"), secret)) {
    return NextResponse.json({ error: "invalid Slack signature" }, { status: 401 });
  }

  let payload: {
    type?: string;
    user?: { id?: string };
    response_url?: string;
    actions?: { action_id?: string; value?: string }[];
  };
  try {
    const form = new URLSearchParams(rawBody);
    payload = JSON.parse(form.get("payload") ?? "") as typeof payload;
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const action = payload.actions?.[0];
  const slackId = payload.user?.id;

  // Dispatch DM buttons. "Track on DTDC" is a link button: Slack opens the page itself and
  // only needs an acknowledgement. "Copy tracking ID" posts the ID as its own message in the
  // same DM so it can be long-pressed and copied; the ID comes from the button the bot sent.
  if (payload.type === "block_actions" && action?.action_id === TRACK_PAGE_ACTION) {
    return new NextResponse(null, { status: 200 });
  }
  if (payload.type === "block_actions" && action?.action_id === SHOW_TRACKING_ACTION) {
    const tracking = action.value?.trim() ?? "";
    let responseUrl: URL | null = null;
    try { responseUrl = payload.response_url ? new URL(payload.response_url) : null; } catch { responseUrl = null; }
    if (isTrackingId(tracking) && responseUrl && responseUrl.protocol === "https:" && responseUrl.hostname === "hooks.slack.com") {
      try {
        await fetch(responseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ response_type: "in_channel", replace_original: false, text: tracking }),
          signal: AbortSignal.timeout(5_000),
        });
      } catch {
        console.warn("[slack] could not post tracking ID reply");
      }
    }
    return new NextResponse(null, { status: 200 });
  }

  const projectId = action?.value;
  if (payload.type !== "block_actions" || action?.action_id !== "missing_details_done" || !slackId || !projectId) {
    return NextResponse.json({ response_type: "ephemeral", text: "This action is not supported." });
  }

  const [row] = await getDb()
    .select({ projectId: projects.id, title: projects.title, makerName: users.name, makerSlackId: users.slackId })
    .from(projects)
    .innerJoin(users, eq(users.sub, projects.userSub))
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!row || row.makerSlackId !== slackId) {
    return NextResponse.json({ response_type: "ephemeral", text: "This reminder does not belong to your account." });
  }

  await notifyMissingDetailsAcknowledged({
    projectId: row.projectId,
    projectTitle: row.title,
    makerName: row.makerName,
    slackId,
  });

  return NextResponse.json({
    response_type: "ephemeral",
    text: "Thanks! Your acknowledgement has been sent to the 3AM team. They will verify your details before sending the project to HQ.",
  });
}
