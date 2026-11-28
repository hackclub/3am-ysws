import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/users";
import { isOrganizer } from "@/lib/auth/organizer";
import { getDb } from "@/lib/db";
import { manualShipments } from "@/lib/db/schema";
import { sendSlackDm } from "@/lib/slack/notifications";

export const dynamic = "force-dynamic";
const STATUSES = ["packing", "posted", "delivered"] as const;
const clean = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const organizer = await getCurrentUser();
  if (!isOrganizer(organizer)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "unreadable" }, { status: 400 }); }

  const status = typeof body.status === "string" ? body.status : undefined;
  if (status && !STATUSES.includes(status as typeof STATUSES[number])) {
    return NextResponse.json({ error: "invalid", field: "status" }, { status: 422 });
  }

  const [existing] = await getDb().select().from(manualShipments).where(eq(manualShipments.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const newlyPosted = status === "posted" && existing.status !== "posted";
  const [updated] = await getDb().update(manualShipments).set({
    ...(status ? { status: status as typeof STATUSES[number] } : {}),
    ...(body.courier !== undefined ? { courier: clean(body.courier, 120) || null } : {}),
    ...(body.tracking !== undefined ? { tracking: clean(body.tracking, 200) || null } : {}),
    ...(body.notes !== undefined ? { notes: clean(body.notes, 2000) || null } : {}),
    ...(newlyPosted ? { dispatchedAt: new Date() } : {}),
    ...(status === "delivered" && existing.status !== "delivered" ? { deliveredAt: new Date() } : {}),
  }).where(eq(manualShipments.id, id)).returning();

  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (newlyPosted && updated.slackId) {
    const tracking = updated.tracking ? `\\n*Tracking ID:* ${updated.tracking}` : "";
    const courier = updated.courier ? `\\n*Courier:* ${updated.courier}` : "";
    await sendSlackDm(updated.slackId,
      `📦 *Your 3AM shipment has been dispatched!*\\nHey ${updated.recipientName} — *${updated.itemName}* is on its way.${courier}${tracking}\\n\\nIf you have questions, DM the 3AM team in Hack Club Slack.`);
  }

  return NextResponse.json({ ok: true, shipment: updated });
}
