import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/users";
import { isOrganizer } from "@/lib/auth/organizer";
import { getDb } from "@/lib/db";
import { manualShipments } from "@/lib/db/schema";
import { parseShipmentInput, toShipmentView } from "@/lib/fulfilment/manual-shipments";

export const dynamic = "force-dynamic";

// Creates a manual shipment. Independent of shop orders: no beans, payments or order rows are touched.
export async function POST(request: Request) {
  const organizer = await getCurrentUser();
  if (!organizer || !isOrganizer(organizer)) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("shape");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "unreadable", message: "The request could not be read." }, { status: 400 });
  }

  const input = parseShipmentInput({ country: "India", ...body }, false);
  if (!input.ok) return NextResponse.json({ error: "validation", field: input.field, message: input.message }, { status: 422 });
  const v = input.values;

  try {
    const [shipment] = await getDb()
      .insert(manualShipments)
      .values({
        recipientName: v.recipientName!,
        recipientEmail: v.recipientEmail!,
        itemName: v.itemName!,
        addressLine1: v.addressLine1!,
        city: v.city!,
        postcode: v.postcode!,
        country: v.country!,
        addressLine2: v.addressLine2 ?? null,
        stateProvince: v.stateProvince ?? null,
        slackId: v.slackId ?? null,
        courier: v.courier ?? null,
        tracking: v.tracking ?? null,
        notes: v.notes ?? null,
        createdBy: organizer.email,
      })
      .returning();
    return NextResponse.json({ ok: true, shipment: toShipmentView(shipment) }, { status: 201 });
  } catch {
    console.error("[manual-shipments] create failed");
    return NextResponse.json({ error: "server", message: "The shipment could not be saved. Try again." }, { status: 500 });
  }
}
