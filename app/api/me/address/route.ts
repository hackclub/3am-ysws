import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { readAddress, validateAddress } from "@/lib/address";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

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

  const address = readAddress(body);
  const problem = validateAddress(address);
  if (problem) {
    return NextResponse.json(
      { error: "invalid", field: problem.field, message: problem.message },
      { status: 422 },
    );
  }

  await getDb()
    .update(users)
    .set({
      fullName: address.fullName,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || null,
      city: address.city,
      postcode: address.postcode,
      country: address.country,
    })
    .where(eq(users.sub, user.sub));

  return NextResponse.json({ ok: true });
}
