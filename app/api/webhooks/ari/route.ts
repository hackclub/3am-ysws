import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { readDeliveryHeaders, verifyDelivery } from "@/lib/ari/delivery";
import { ariWebhookSecret } from "@/lib/ari/signature";
import { getDb } from "@/lib/db";
import { projects, webhookEvents } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Delivery = { event?: string; external_id?: string };

export async function POST(request: Request) {
  const raw = await request.text();

  let secret: string;
  try {
    secret = ariWebhookSecret();
  } catch {
    console.error("[ari] webhook received but ARI_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const check = verifyDelivery(raw, readDeliveryHeaders(request.headers), secret);
  if (!check.ok) {
    console.error(`[ari] rejected delivery: ${check.reason}`);
    return NextResponse.json({ error: check.reason }, { status: 401 });
  }

  let body: Delivery;
  try {
    body = JSON.parse(raw) as Delivery;
  } catch {
    console.error(`[ari] delivery ${check.deliveryId} was not json`);
    return NextResponse.json({ error: "unreadable" }, { status: 400 });
  }

  const db = getDb();
  const externalId = body.external_id;
  let projectId: string | null = null;

  if (externalId && UUID.test(externalId)) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, externalId))
      .limit(1);
    projectId = project?.id ?? null;
  }

  if (externalId && !projectId) {
    console.error(`[ari] delivery ${check.deliveryId} names unknown project ${externalId}`);
  }

  const [recorded] = await db
    .insert(webhookEvents)
    .values({
      deliveryId: check.deliveryId,
      projectId,
      event: body.event ?? "unknown",
      payload: JSON.parse(raw) as Record<string, unknown>,
    })
    .onConflictDoNothing({ target: webhookEvents.deliveryId })
    .returning({ deliveryId: webhookEvents.deliveryId });

  if (!recorded) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  return NextResponse.json({ ok: true });
}
