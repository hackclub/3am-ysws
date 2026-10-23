import { and, desc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  projects,
  reviewerLedger,
  reviewerPayConfig,
  reviewers,
  webhookEvents,
} from "@/lib/db/schema";
import type { Reviewer } from "@/lib/db/schema";

import { creditFromDelivery, normaliseEmail, normaliseSlackId, roundCents, usd } from "./pay";

export type SeenIdentity = {
  key: string;
  slackId: string | null;
  email: string | null;
  name: string | null;
  reviews: number;
};

export type SyncResult = {
  credited: number;
  unmatched: SeenIdentity[];
  unattributed: number;
};

const NOT_DECISIONS = ["review.reverted", "review.requeued"];

export async function payoutsStart(): Promise<Date> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(reviewerPayConfig)
    .where(eq(reviewerPayConfig.id, 1))
    .limit(1);
  if (row) return row.payoutsStart;
  // Migration inserts this row; recreate it if someone deleted it.
  const [created] = await db
    .insert(reviewerPayConfig)
    .values({ id: 1 })
    .onConflictDoNothing()
    .returning();
  return created?.payoutsStart ?? new Date();
}

// Reads every stored Ari decision that has no ledger row yet and credits the reviewer.
// Idempotent: the unique delivery_id index means running it twice never pays twice.
// Called from the Ari webhook (live) and on every reviewer page load (safety net).
export async function syncReviewerLedger(): Promise<SyncResult> {
  const db = getDb();
  const start = await payoutsStart();
  const all = await db.select().from(reviewers);

  const bySlack = new Map<string, Reviewer>();
  const byEmail = new Map<string, Reviewer>();
  for (const reviewer of all) {
    bySlack.set(normaliseSlackId(reviewer.slackId), reviewer);
    if (reviewer.email) byEmail.set(normaliseEmail(reviewer.email), reviewer);
  }

  const pending = await db
    .select({
      deliveryId: webhookEvents.deliveryId,
      projectId: webhookEvents.projectId,
      payload: webhookEvents.payload,
      receivedAt: webhookEvents.receivedAt,
    })
    .from(webhookEvents)
    .leftJoin(reviewerLedger, eq(reviewerLedger.deliveryId, webhookEvents.deliveryId))
    .where(and(isNull(reviewerLedger.id), notInArray(webhookEvents.event, NOT_DECISIONS)))
    .orderBy(webhookEvents.receivedAt);

  const unmatched = new Map<string, SeenIdentity>();
  let unattributed = 0;
  const rows: (typeof reviewerLedger.$inferInsert)[] = [];

  for (const event of pending) {
    const credit = creditFromDelivery(event.payload);
    if (!credit) continue;

    const who = credit.reviewer;
    if (!who) {
      unattributed += 1;
      continue;
    }

    const reviewer =
      (who.slackId ? bySlack.get(who.slackId) : undefined) ??
      (who.email ? byEmail.get(who.email) : undefined);

    if (!reviewer) {
      const key = who.slackId ?? who.email ?? "unknown";
      const seen = unmatched.get(key) ?? {
        key,
        slackId: who.slackId,
        email: who.email,
        name: who.name,
        reviews: 0,
      };
      seen.reviews += 1;
      unmatched.set(key, seen);
      continue;
    }

    // Reviews done after removal are not paid and stay unrecorded.
    if (reviewer.removedAt && event.receivedAt >= reviewer.removedAt) continue;

    const historic = event.receivedAt < start;
    rows.push({
      reviewerId: reviewer.id,
      kind: "review",
      delta: historic ? 0 : credit.usd,
      deliveryId: event.deliveryId,
      projectId: event.projectId,
      decision: credit.decision,
      approvedMinutes: credit.approvedMinutes,
      note: historic ? `before payouts started · already paid (${usd(credit.usd)} tier)` : null,
      createdBy: "ari",
      createdAt: event.receivedAt,
    });
  }

  let credited = 0;
  for (let index = 0; index < rows.length; index += 500) {
    const inserted = await db
      .insert(reviewerLedger)
      .values(rows.slice(index, index + 500))
      .onConflictDoNothing()
      .returning({ id: reviewerLedger.id });
    credited += inserted.length;
  }

  return {
    credited,
    unmatched: [...unmatched.values()].sort((a, b) => b.reviews - a.reviews),
    unattributed,
  };
}

// Never lets a payout bug take down the webhook or a page.
export async function syncReviewerLedgerSafely(where: string): Promise<SyncResult | null> {
  try {
    return await syncReviewerLedger();
  } catch (error) {
    console.error(`[reviewers] sync failed (${where})`, error);
    return null;
  }
}

export type ReviewerSummary = {
  id: string;
  name: string;
  slackId: string;
  email: string | null;
  removedAt: Date | null;
  owed: number;
  earned: number;
  paidOut: number;
  reviews: number;
  paidReviews: number;
  lastPaidAt: Date | null;
};

export async function reviewerSummaries(): Promise<ReviewerSummary[]> {
  const rows = await getDb()
    .select({
      id: reviewers.id,
      name: reviewers.name,
      slackId: reviewers.slackId,
      email: reviewers.email,
      removedAt: reviewers.removedAt,
      owed: sql<string>`coalesce(sum(${reviewerLedger.delta}), 0)`,
      earned: sql<string>`coalesce(sum(${reviewerLedger.delta}) filter (where ${reviewerLedger.kind} <> 'payout'), 0)`,
      paidOut: sql<string>`coalesce(-sum(${reviewerLedger.delta}) filter (where ${reviewerLedger.kind} = 'payout'), 0)`,
      reviews: sql<number>`count(${reviewerLedger.id}) filter (where ${reviewerLedger.kind} = 'review')::int`,
      paidReviews: sql<number>`count(${reviewerLedger.id}) filter (where ${reviewerLedger.kind} = 'review' and ${reviewerLedger.delta} > 0)::int`,
      // drizzle's postgres-js driver returns raw sql timestamps as strings, not Dates.
      lastPaidAt: sql<string | null>`max(${reviewerLedger.createdAt}) filter (where ${reviewerLedger.kind} = 'payout')`,
    })
    .from(reviewers)
    .leftJoin(reviewerLedger, eq(reviewerLedger.reviewerId, reviewers.id))
    .groupBy(reviewers.id)
    .orderBy(reviewers.name);

  return rows.map((row) => ({
    ...row,
    owed: roundCents(Number(row.owed)),
    earned: roundCents(Number(row.earned)),
    paidOut: roundCents(Number(row.paidOut)),
    lastPaidAt: row.lastPaidAt ? new Date(row.lastPaidAt) : null,
  }));
}

export async function reviewerHistory(reviewerId: string) {
  return getDb()
    .select({
      id: reviewerLedger.id,
      kind: reviewerLedger.kind,
      delta: reviewerLedger.delta,
      decision: reviewerLedger.decision,
      approvedMinutes: reviewerLedger.approvedMinutes,
      note: reviewerLedger.note,
      createdBy: reviewerLedger.createdBy,
      createdAt: reviewerLedger.createdAt,
      projectId: reviewerLedger.projectId,
      projectTitle: projects.title,
    })
    .from(reviewerLedger)
    .leftJoin(projects, eq(projects.id, reviewerLedger.projectId))
    .where(eq(reviewerLedger.reviewerId, reviewerId))
    .orderBy(desc(reviewerLedger.createdAt), desc(reviewerLedger.id));
}

export type LeaderPeriod = "week" | "month" | "all";

export function periodStart(period: LeaderPeriod, now = new Date()): Date | null {
  if (period === "all") return null;
  if (period === "month") return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const day = (now.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
}

export type LeaderRow = {
  id: string;
  name: string;
  reviews: number;
  minutes: number;
  earned: number;
};

export async function leaderboard(period: LeaderPeriod): Promise<LeaderRow[]> {
  const since = periodStart(period);
  const conditions = [eq(reviewerLedger.kind, "review"), isNull(reviewers.removedAt)];
  if (since) conditions.push(sql`${reviewerLedger.createdAt} >= ${since.toISOString()}`);

  const rows = await getDb()
    .select({
      id: reviewers.id,
      name: reviewers.name,
      reviews: sql<number>`count(*)::int`,
      minutes: sql<number>`coalesce(sum(${reviewerLedger.approvedMinutes}), 0)::int`,
      earned: sql<string>`coalesce(sum(${reviewerLedger.delta}), 0)`,
    })
    .from(reviewerLedger)
    .innerJoin(reviewers, eq(reviewers.id, reviewerLedger.reviewerId))
    .where(and(...conditions))
    .groupBy(reviewers.id)
    .orderBy(desc(sql`count(*)`), desc(sql`sum(${reviewerLedger.approvedMinutes})`));

  return rows.map((row) => ({ ...row, earned: roundCents(Number(row.earned)) }));
}

export async function reviewerForIdentity(
  slackId: string | null | undefined,
  email: string | null | undefined,
): Promise<Reviewer | null> {
  const db = getDb();

  // Slack ID is the primary identity and always wins if it matches.
  if (slackId) {
    const [bySlack] = await db
      .select()
      .from(reviewers)
      .where(eq(reviewers.slackId, normaliseSlackId(slackId)))
      .limit(1);
    if (bySlack) return bySlack;
  }

  // Some people have changed the email on their Hack Club account. Fall back only
  // to an exact, case-insensitive email match from the authenticated account.
  if (email?.trim()) {
    const [byEmail] = await db
      .select()
      .from(reviewers)
      .where(sql`lower(${reviewers.email}) = ${normaliseEmail(email)}`)
      .limit(1);
    if (byEmail) return byEmail;
  }

  return null;
}

export async function reviewerForSlackId(
  slackId: string | null | undefined,
): Promise<Reviewer | null> {
  return reviewerForIdentity(slackId, null);
}

// For the nav: never throws, so a missing table or DB blip cannot break every page.
export async function isReviewerSafely(
  slackId: string | null | undefined,
  email?: string | null,
): Promise<boolean> {
  try {
    const reviewer = await reviewerForIdentity(slackId, email);
    return Boolean(reviewer);
  } catch {
    return false;
  }
}

export async function namesForSlackIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const { users } = await import("@/lib/db/schema");
  const rows = await getDb()
    .select({ slackId: users.slackId, name: users.name })
    .from(users)
    .where(inArray(sql`upper(${users.slackId})`, ids));
  return new Map(rows.map((row) => [normaliseSlackId(row.slackId), row.name]));
}
