import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { isOrganizer } from "@/lib/auth/organizer";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { cleanItem, validateItem } from "@/lib/items";
import type { ItemInput } from "@/lib/items";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!isOrganizer(user)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { id } = await params;

  let body: ItemInput;
  try {
    body = (await request.json()) as ItemInput;
  } catch {
    return NextResponse.json({ error: "unreadable" }, { status: 400 });
  }

  const problem = validateItem(body, false);
  if (problem) return NextResponse.json({ error: "invalid", ...problem }, { status: 422 });

  const values = cleanItem(body);
  if (Object.keys(values).length === 0) {
    return NextResponse.json({ error: "nothing_to_change" }, { status: 422 });
  }

  const [row] = await getDb()
    .update(items)
    .set(values)
    .where(eq(items.id, id))
    .returning({ id: items.id });

  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, id: row.id });
}
