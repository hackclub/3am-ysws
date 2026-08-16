import { NextResponse } from "next/server";

import { isOrganizer } from "@/lib/auth/organizer";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { cleanItem, validateItem } from "@/lib/items";
import type { ItemInput } from "@/lib/items";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!isOrganizer(user)) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: ItemInput;
  try {
    body = (await request.json()) as ItemInput;
  } catch {
    return NextResponse.json({ error: "unreadable" }, { status: 400 });
  }

  const problem = validateItem(body);
  if (problem) return NextResponse.json({ error: "invalid", ...problem }, { status: 422 });

  const [row] = await getDb()
    .insert(items)
    .values(cleanItem(body) as typeof items.$inferInsert)
    .returning({ id: items.id });

  return NextResponse.json({ ok: true, id: row.id });
}
