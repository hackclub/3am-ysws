import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/users";
import { isOrganizer } from "@/lib/auth/organizer";
import { getDb } from "@/lib/db";
import { manualShipments } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const ITEMS = ["Stickers", "3AM Swag Kit"] as const;
const clean = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request) {
  const organizer = await getCurrentUser();
  if (!isOrganizer(organizer)) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "unreadable" }, { status: 400 }); }

  const recipientName = clean(body.recipientName, 160);
  const recipientEmail = clean(body.recipientEmail, 254).toLowerCase();
  const itemName = clean(body.itemName, 80);
  const addressLine1 = clean(body.addressLine1, 300);
  const city = clean(body.city, 120);
  const postcode = clean(body.postcode, 40);
  const country = clean(body.country, 100);
  const slackId = clean(body.slackId, 30).toUpperCase();

  if (!recipientName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail) ||
      !ITEMS.includes(itemName as typeof ITEMS[number]) || !addressLine1 || !city || !postcode || !country) {
    return NextResponse.json({ error: "validation", message: "Add a valid name, email, item and complete shipping address." }, { status: 422 });
  }
  if (slackId && !/^[UW][A-Z0-9]+$/.test(slackId)) {
    return NextResponse.json({ error: "validation", message: "Slack member ID must look like U… or W…." }, { status: 422 });
  }

  const [shipment] = await getDb().insert(manualShipments).values({
    recipientName, recipientEmail, itemName, addressLine1,
    addressLine2: clean(body.addressLine2, 300) || null,
    city, stateProvince: clean(body.stateProvince, 120) || null,
    postcode, country, slackId: slackId || null,
    courier: clean(body.courier, 120) || null,
    tracking: clean(body.tracking, 200) || null,
    notes: clean(body.notes, 2000) || null,
    createdBy: organizer.email,
  }).returning();

  return NextResponse.json({ ok: true, shipment }, { status: 201 });
}
