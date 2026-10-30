import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { isOrganizer } from "@/lib/auth/organizer";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { beansLedger, reviewerInvoices, reviewerLedger, reviewers, users } from "@/lib/db/schema";
import {
  declinedMessage,
  paidMessage,
  resendInvoice,
  tellReviewer,
} from "@/lib/reviewers/invoices";
import { roundCents, usd } from "@/lib/reviewers/pay";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Body =
  | { action?: "remove" | "restore" }
  | { action: "adjust"; delta?: number; note?: string }
  | { action: "payout"; expected?: number; note?: string }
  | { action: "decline"; invoiceId?: string; note?: string }
  | { action: "resend"; invoiceId?: string };

function invalid(field: string, message: string, status = 422) {
  return NextResponse.json({ error: "invalid", field, message }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const organizer = await getCurrentUser();
  if (!isOrganizer(organizer)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const by = organizer?.slackId ?? "organizer";

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "unreadable" }, { status: 400 });
  }

  const db = getDb();
  const [reviewer] = await db.select().from(reviewers).where(eq(reviewers.id, id)).limit(1);
  if (!reviewer) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (body.action === "remove" || body.action === "restore") {
    await db
      .update(reviewers)
      .set({ removedAt: body.action === "remove" ? new Date() : null })
      .where(eq(reviewers.id, id));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "adjust") {
    const delta = Number(body.delta);
    if (!Number.isFinite(delta) || delta === 0 || roundCents(delta) !== delta) {
      return invalid(
        "delta",
        "Use dollars with at most 2 decimals, positive or negative, not zero.",
      );
    }
    if (Math.abs(delta) > 10000) return invalid("delta", "That is a lot. Over $10,000 is blocked.");
    const note = body.note?.trim() ?? "";
    if (note.length < 3) return invalid("note", "Say why. It stays in their history forever.");

    await db.insert(reviewerLedger).values({
      reviewerId: id,
      kind: "adjustment",
      delta,
      note,
      createdBy: by,
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "payout") {
    const expected = roundCents(Number(body.expected));
    const note = body.note?.trim() || null;

    // Lock the reviewer so two clicks (or two organisers) cannot pay the same balance twice.
    const outcome = await db.transaction(async (tx) => {
      await tx
        .select({ id: reviewers.id })
        .from(reviewers)
        .where(eq(reviewers.id, id))
        .for("update");
      const [row] = await tx
        .select({ owed: sql<string>`coalesce(sum(${reviewerLedger.delta}), 0)` })
        .from(reviewerLedger)
        .where(eq(reviewerLedger.reviewerId, id));
      const owed = roundCents(Number(row?.owed ?? 0));

      if (owed <= 0) return { status: "nothing" as const, owed };
      if (owed !== expected) return { status: "changed" as const, owed };

      await tx.insert(reviewerLedger).values({
        reviewerId: id,
        kind: "payout",
        delta: -owed,
        note: note ?? `paid ${usd(owed)}`,
        createdBy: by,
      });

      // Credit the matching 3AM account by Slack ID in the same transaction.
      // The zeroed reviewer balance prevents a retry from crediting beans twice.
      const [account] = await tx
        .select({ sub: users.sub })
        .from(users)
        .where(sql`upper(${users.slackId}) = ${reviewer.slackId.toUpperCase()}`)
        .limit(1);
      if (account) {
        await tx.insert(beansLedger).values({
          userSub: account.sub,
          delta: owed,
          reason: "manual",
          note: `Reviewer payout: ${usd(owed)} USD → ${owed} beans`,
        });
      }

      // The tick also settles their open invoice, if they sent one.
      await tx
        .update(reviewerInvoices)
        .set({ status: "paid", closedAt: new Date(), closedBy: by, paidAmount: owed })
        .where(and(eq(reviewerInvoices.reviewerId, id), eq(reviewerInvoices.status, "requested")));
      return { status: "paid" as const, owed, beansCredited: Boolean(account) };
    });

    if (outcome.status === "nothing") {
      return invalid("expected", "They are owed nothing right now.", 409);
    }
    if (outcome.status === "changed") {
      return invalid(
        "expected",
        `Their balance changed to ${usd(outcome.owed)} while you were looking. Check it and tick again.`,
        409,
      );
    }
    await tellReviewer(reviewer, paidMessage(outcome.owed));
    return NextResponse.json({
      ok: true,
      paid: outcome.owed,
      beansCredited: outcome.beansCredited,
      ...(outcome.beansCredited ? {} : { warning: "Payout recorded, but no 3AM account matched this reviewer's Slack ID. Beans were not credited." }),
    });
  }

  if (body.action === "decline" || body.action === "resend") {
    const invoiceId = body.invoiceId ?? "";
    if (!UUID.test(invoiceId)) return invalid("invoiceId", "Which invoice?");
    const where = and(
      eq(reviewerInvoices.id, invoiceId),
      eq(reviewerInvoices.reviewerId, id),
      eq(reviewerInvoices.status, "requested"),
    );

    if (body.action === "resend") {
      const sent = await resendInvoice(invoiceId);
      return sent
        ? NextResponse.json({ ok: true })
        : invalid(
            "invoiceId",
            "Slack did not take it. Check SLACK_BOT_TOKEN and the recipient.",
            502,
          );
    }

    const reason = body.note?.trim() || null;
    const [declined] = await db
      .update(reviewerInvoices)
      .set({
        status: "declined",
        closedAt: new Date(),
        closedBy: by,
        ...(reason ? { note: `declined: ${reason}` } : {}),
      })
      .where(where)
      .returning();
    if (!declined) return invalid("invoiceId", "That invoice is not open any more.", 409);
    await tellReviewer(reviewer, declinedMessage(declined.amount, reason));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
