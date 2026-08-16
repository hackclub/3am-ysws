import { and, eq, gt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { isOrganizer } from "@/lib/auth/organizer";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { beansLedger, items, orders } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const STATUSES = ["placed", "needs_address", "packing", "posted", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

type Body = { status?: string; tracking?: string; adminNote?: string };

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
    if (!order) return "not_found" as const;

    const cancelling = status === "cancelled" && order.status !== "cancelled";
    const uncancelling = order.status === "cancelled" && status && status !== "cancelled";
    if (uncancelling) return "already_cancelled" as const;

    await tx
      .update(orders)
      .set({
        ...(status ? { status } : {}),
        ...(body.tracking !== undefined ? { tracking: body.tracking.trim() || null } : {}),
        ...(body.adminNote !== undefined ? { adminNote: body.adminNote.trim() || null } : {}),
        ...(status === "posted" ? { fulfilledAt: new Date() } : {}),
      })
      .where(eq(orders.id, order.id));

    if (cancelling) {
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

    return "ok" as const;
  });

  if (result === "not_found") return NextResponse.json({ error: "not found" }, { status: 404 });
  if (result === "already_cancelled") {
    return NextResponse.json(
      { error: "already_cancelled", message: "That order was cancelled and refunded." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
