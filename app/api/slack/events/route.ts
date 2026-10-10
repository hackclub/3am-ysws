import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { notifySlackMemberJoined } from "@/lib/slack/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_CLOCK_SKEW_SECONDS = 60 * 5;

function isValidSlackRequest(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  signingSecret: string,
): boolean {
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;

  const requestTime = Number(timestamp);
  if (!Number.isSafeInteger(requestTime)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - requestTime) > MAX_CLOCK_SKEW_SECONDS) return false;

  const baseString = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${createHmac("sha256", signingSecret).update(baseString).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function POST(request: Request) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET?.trim();
  const channelId = process.env.SLACK_ONBOARDING_CHANNEL_ID?.trim();

  if (!signingSecret || !channelId) {
    return NextResponse.json({ error: "Slack onboarding is not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  if (
    !isValidSlackRequest(
      rawBody,
      request.headers.get("x-slack-request-timestamp"),
      request.headers.get("x-slack-signature"),
      signingSecret,
    )
  ) {
    return NextResponse.json({ error: "invalid Slack signature" }, { status: 401 });
  }

  let payload: {
    type?: string;
    challenge?: string;
    event?: { type?: string; channel?: string; user?: string };
  };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (payload.type === "url_verification" && typeof payload.challenge === "string") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  if (
    payload.type === "event_callback" &&
    payload.event?.type === "member_joined_channel" &&
    payload.event.channel === channelId &&
    payload.event.user &&
    /^[UW][A-Z0-9]+$/.test(payload.event.user)
  ) {
    // Acknowledge quickly; Slack retries callbacks that take too long.
    const userId = payload.event.user;
    void notifySlackMemberJoined(userId).catch(() => {
      console.warn("[slack] onboarding DM failed");
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: true });
}
