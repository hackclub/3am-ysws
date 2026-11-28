import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/users";
import { isOrganizer } from "@/lib/auth/organizer";
import { getDb } from "@/lib/db";
import { manualShipments } from "@/lib/db/schema";
import type { ManualShipment } from "@/lib/db/schema";
import {
  STALE_SEND_MS,
  dispatchMessage,
  isShipmentId,
  parseShipmentInput,
  parseStatus,
  statusTimestamps,
  toShipmentView,
} from "@/lib/fulfilment/manual-shipments";
import { dispatchBlocks } from "@/lib/fulfilment/tracking";
import { sendSlackDm } from "@/lib/slack/notifications";

export const dynamic = "force-dynamic";

type Outcome =
  | { kind: "not_found" }
  | { kind: "conflict"; current: ManualShipment }
  | { kind: "invalid"; message: string }
  | { kind: "ok"; shipment: ManualShipment; notify: boolean };

/**
 * Updates a manual shipment.
 * Body: any editable field, `status`, `expectedUpdatedAt` (required: the updatedAt the client last saw)
 * and `resendNotification: true` to retry the dispatch DM.
 * The dispatch DM is sent at most once automatically: only the request that moves the shipment to
 * posted for the first time, under a row lock, claims it.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const organizer = await getCurrentUser();
  if (!organizer || !isOrganizer(organizer)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { id } = await params;
  if (!isShipmentId(id)) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("shape");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "unreadable", message: "The request could not be read." }, { status: 400 });
  }

  const status = parseStatus(body.status);
  if (status === null) return NextResponse.json({ error: "validation", field: "status", message: "Status must be packing, posted or delivered." }, { status: 422 });

  const input = parseShipmentInput(body, true);
  if (!input.ok) return NextResponse.json({ error: "validation", field: input.field, message: input.message }, { status: 422 });

  const expected = typeof body.expectedUpdatedAt === "string" ? Date.parse(body.expectedUpdatedAt) : NaN;
  if (!Number.isFinite(expected)) {
    return NextResponse.json({ error: "validation", field: "expectedUpdatedAt", message: "Missing version. Refresh the page and try again." }, { status: 422 });
  }
  const resend = body.resendNotification === true;

  let outcome: Outcome;
  try {
    outcome = await getDb().transaction(async (tx): Promise<Outcome> => {
      const [existing] = await tx.select().from(manualShipments).where(eq(manualShipments.id, id)).for("update").limit(1);
      if (!existing) return { kind: "not_found" };
      if (existing.updatedAt.getTime() !== expected) return { kind: "conflict", current: existing };

      const now = new Date();
      const nextStatus = status ?? existing.status;
      const slackId = input.values.slackId !== undefined ? input.values.slackId : existing.slackId;
      const sendingStale = existing.notifyStatus === "sending" &&
        (!existing.notifyAttemptedAt || now.getTime() - existing.notifyAttemptedAt.getTime() > STALE_SEND_MS);
      const claimable = existing.notifyStatus !== "sending" || sendingStale;

      if (resend) {
        if (nextStatus === "packing") return { kind: "invalid", message: "Mark the shipment posted before sending the dispatch DM." };
        if (!slackId) return { kind: "invalid", message: "Add a Slack member ID first." };
        if (!claimable) return { kind: "invalid", message: "A DM is being sent right now. Wait a moment and refresh." };
      }

      // First move into posted, never notified before: this request owns the DM.
      const firstDispatch = nextStatus === "posted" && existing.status !== "posted" && !existing.notifiedAt &&
        existing.notifyStatus !== "sent" && Boolean(slackId) && claimable;
      const notify = resend || firstDispatch;

      const [shipment] = await tx
        .update(manualShipments)
        .set({
          // parseShipmentInput rejects empty required fields, so only optional ones can be null here.
          ...(input.values as Partial<typeof manualShipments.$inferInsert>),
          ...(status ? { status } : {}),
          ...(status ? statusTimestamps(existing, status, now) : {}),
          ...(notify ? { notifyStatus: "sending" as const, notifyAttemptedAt: now } : {}),
          updatedAt: now,
        })
        .where(eq(manualShipments.id, id))
        .returning();
      if (!shipment) return { kind: "not_found" };
      return { kind: "ok", shipment, notify };
    });
  } catch {
    console.error("[manual-shipments] update failed");
    return NextResponse.json({ error: "server", message: "The shipment could not be saved. Try again." }, { status: 500 });
  }

  if (outcome.kind === "not_found") return NextResponse.json({ error: "not found", message: "That shipment no longer exists." }, { status: 404 });
  if (outcome.kind === "invalid") return NextResponse.json({ error: "invalid", message: outcome.message }, { status: 409 });
  if (outcome.kind === "conflict") {
    return NextResponse.json(
      { error: "conflict", message: "Someone else changed this shipment. The latest version is shown; check it and try again.", shipment: toShipmentView(outcome.current) },
      { status: 409 },
    );
  }

  let shipment = outcome.shipment;
  let notification: "sent" | "failed" | null = null;
  if (outcome.notify && shipment.slackId) {
    // The shipment is already saved; a Slack problem is recorded, never turned into a failed update.
    let delivered = false;
    try {
      const text = dispatchMessage(shipment);
      delivered = await sendSlackDm(shipment.slackId, text, dispatchBlocks(text, shipment.tracking, shipment.courier));
    }
    catch { delivered = false; }
    notification = delivered ? "sent" : "failed";
    if (!delivered) console.warn("[manual-shipments] dispatch DM failed; shipment was updated");
    try {
      const [recorded] = await getDb()
        .update(manualShipments)
        .set({ notifyStatus: notification, ...(delivered ? { notifiedAt: new Date() } : {}) })
        .where(eq(manualShipments.id, shipment.id))
        .returning();
      if (recorded) shipment = recorded;
    } catch {
      console.error("[manual-shipments] could not record DM result");
    }
  }

  return NextResponse.json({ ok: true, shipment: toShipmentView(shipment), notification });
}
