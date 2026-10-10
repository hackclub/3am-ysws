import { and, eq, gt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { isOrganizer } from "@/lib/auth/organizer";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { beansLedger, items, orders, users } from "@/lib/db/schema";
import { notifyOrderFulfilled } from "@/lib/slack/notifications";

export const dynamic = "force-dynamic";

const STATUSES = [
  "placed",
  "needs_address",
  "packing",
  "ready_to_fulfil",
  "posted",
  "cancelled",
] as const;
type Status = (typeof STATUSES)[number];

type Body = {
  status?: string;
  tracking?: string;
  adminNote?: string;
  refundBeans?: boolean;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const organizer = await getCurrentUser();
  if (!isOrganizer(organizer)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { id } = await params;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "unreadable" }, { status: 400 });
  }

  const status = body.status as Status | undefined;
  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ error: "invalid", field: "status" }, { status: 422 });
  }

  const result = await getDb().transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for("update").limit(1);
    if (!order) return { status: "not_found" as const };

    const cancelling = status === "cancelled" && order.status !== "cancelled";
    const uncancelling = order.status === "cancelled" && status && status !== "cancelled";
    if (uncancelling) return { status: "already_cancelled" as const };

    if (cancelling && !body.adminNote?.trim()) {
      return { status: "missing_cancel_note" as const };
    }

    const newlyPosted = status === "posted" && order.status !== "posted";
    const fulfilledAt = newlyPosted ? new Date() : null;

    await tx
      .update(orders)
      .set({
        ...(status ? { status } : {}),
        ...(body.tracking !== undefined ? { tracking: body.tracking.trim() || null } : {}),
        ...(body.adminNote !== undefined ? { adminNote: body.adminNote.trim() || null } : {}),
        ...(fulfilledAt ? { fulfilledAt } : {}),
      })
      .where(eq(orders.id, order.id));

    if (cancelling && body.refundBeans) {
      await tx.insert(beansLedger).values({
        userSub: order.userSub,
        delta: order.cost,
        reason: "manual",
        note: `refund for ${order.itemName}`,
      });

      if (order.itemId) {
        await tx
          .update(items)
          .set({ stock: sql`${items.stock} + 1` })
          .where(and(eq(items.id, order.itemId), gt(items.stock, -1)));
      }
    }

    let notification:
      | { slackId: string; makerName: string; itemName: string }
      | null = null;

    if (newlyPosted) {
      const [maker] = await tx
        .select({ name: users.name, slackId: users.slackId })
        .from(users)
        .where(eq(users.sub, order.userSub))
        .limit(1);

      if (maker?.slackId) {
        notification = {
          slackId: maker.slackId,
          makerName: order.fullName?.trim() || maker.name || "there",
          itemName: order.itemName,
        };
      }
    }

    return { status: "ok" as const, notification };
  });

  if (result.status === "not_found") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (result.status === "already_cancelled") {
    return NextResponse.json(
      { error: "already_cancelled", message: "That order is already cancelled." },
      { status: 409 },
    );
  }
  if (result.status === "missing_cancel_note") {
    return NextResponse.json(
      { error: "missing_cancel_note", message: "Add a comment so the maker knows why the order was cancelled." },
      { status: 422 },
    );
  }

  if (result.notification) {
    await notifyOrderFulfilled(result.notification);
  }

  return NextResponse.json({ ok: true });
}
