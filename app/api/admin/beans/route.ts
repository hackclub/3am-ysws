import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { isOrganizer } from "@/lib/auth/organizer";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { beansLedger, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type Body = { userSub?: string; delta?: number; note?: string };

function invalid(field: string, message: string) {
  return NextResponse.json({ error: "invalid", field, message }, { status: 422 });
}

export async function POST(request: Request) {
  const organizer = await getCurrentUser();
  if (!isOrganizer(organizer)) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "unreadable" }, { status: 400 });
  }

  if (!body.userSub) return invalid("userSub", "Pick a maker first.");

  const delta = Number(body.delta);
  if (!Number.isInteger(delta) || delta === 0) {
    return invalid("delta", "Use a whole number, positive or negative, and not zero.");
  }

  const note = body.note?.trim();
  if (!note || note.length < 3) {
    return invalid("note", "Say why. Whoever reads this ledger next will need it.");
  }

  const db = getDb();
  const [maker] = await db
    .select({ sub: users.sub })
    .from(users)
    .where(eq(users.sub, body.userSub))
    .limit(1);

  if (!maker) return NextResponse.json({ error: "not found" }, { status: 404 });

  await db.insert(beansLedger).values({
    userSub: maker.sub,
    delta,
    reason: "manual",
    note: `${note} (by ${organizer?.slackId ?? "organizer"})`,
  });

  return NextResponse.json({ ok: true });
}
