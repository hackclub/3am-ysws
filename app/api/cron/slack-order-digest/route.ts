import { and, asc, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { slackOrderDigestEvents } from "@/lib/db/schema";
import { notifyOrderDigest } from "@/lib/slack/notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const BATCH_SIZE = 50;
const CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

async function handle(request: Request) {
  const secret = process.env.SLACK_ORDER_DIGEST_CRON_SECRET?.trim();
  const userId = process.env.SLACK_ORDER_DIGEST_USER_ID?.trim();

  if (!secret || !userId) {
    return NextResponse.json({ error: "order digest is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const staleClaim = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
  const claimed = await getDb().transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(slackOrderDigestEvents)
      .where(
        and(
          isNull(slackOrderDigestEvents.deliveredAt),
          or(
            isNull(slackOrderDigestEvents.claimedAt),
            lt(slackOrderDigestEvents.claimedAt, staleClaim),
          ),
        ),
      )
      .orderBy(asc(slackOrderDigestEvents.createdAt))
      .limit(BATCH_SIZE)
      .for("update", { skipLocked: true });

    if (rows.length === 0) return [];

    await tx
      .update(slackOrderDigestEvents)
      .set({
        claimedAt: now,
        attempts: sql`${slackOrderDigestEvents.attempts} + 1`,
      })
      .where(inArray(slackOrderDigestEvents.id, rows.map((row) => row.id)));

    return rows;
  });

  if (claimed.length === 0) {
    return NextResponse.json({ ok: true, sent: false, events: 0 });
  }

  const sent = await notifyOrderDigest(
    userId,
    claimed.map((row) => ({
      id: row.id,
      orderId: row.orderId,
      eventType: row.eventType as "created" | "shipped",
      payload: row.payload,
      createdAt: row.createdAt,
    })),
  );

  const ids = claimed.map((row) => row.id);
  if (sent) {
    await getDb()
      .update(slackOrderDigestEvents)
      .set({ deliveredAt: new Date(), claimedAt: null, lastError: null })
      .where(inArray(slackOrderDigestEvents.id, ids));
    return NextResponse.json({ ok: true, sent: true, events: claimed.length });
  }

  await getDb()
    .update(slackOrderDigestEvents)
    .set({ claimedAt: null, lastError: "Slack DM delivery failed" })
    .where(inArray(slackOrderDigestEvents.id, ids));

  return NextResponse.json({ error: "Slack DM delivery failed", events: claimed.length }, { status: 502 });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
