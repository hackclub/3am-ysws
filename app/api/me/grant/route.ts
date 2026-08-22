import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { readGrant, validateGrant } from "@/lib/grant";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  let body: Record<string, string>;
  try {
    body = (await request.json()) as Record<string, string>;
  } catch {
    return NextResponse.json({ error: "unreadable" }, { status: 400 });
  }

  const details = readGrant(body);
  const problem = validateGrant(details);
  if (problem) {
    return NextResponse.json(
      { error: "invalid", field: problem.field, message: problem.message },
      { status: 422 },
    );
  }

  await getDb()
    .update(users)
    .set({
      firstName: details.firstName,
      lastName: details.lastName,
      birthday: details.birthday,
    })
    .where(eq(users.sub, user.sub));

  return NextResponse.json({ ok: true });
}
