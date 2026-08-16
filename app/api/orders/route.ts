import { and, eq, gt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { beansLedger, items, orders, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type Body = {
  itemId?: string;
  fullName?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
  country?: string;
};

const REQUIRED: [keyof Body, string][] = [
  ["fullName", "We need a name for the parcel."],
  ["email", "We need an email in case something goes wrong."],
  ["addressLine1", "We need a street and number."],
  ["city", "We need a city."],
  ["postcode", "We need a postcode."],
  ["country", "We need a country."],
];

function invalid(field: string, message: string) {
  return NextResponse.json({ error: "invalid", field, message }, { status: 422 });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return invalid("body", "That request was not readable.");
  }

  if (!body.itemId) return invalid("itemId", "Pick something first.");

  for (const [field, message] of REQUIRED) {
    if (!body[field]?.trim()) return invalid(field, message);
  }
  if (!body.email?.includes("@")) return invalid("email", "That does not look like an email.");

  try {
    const orderId = await getDb().transaction(async (tx) => {
      await tx.select({ sub: users.sub }).from(users).where(eq(users.sub, user.sub)).for("update");

      const [item] = await tx
        .select()
        .from(items)
        .where(eq(items.id, body.itemId as string))
        .for("update")
        .limit(1);

      if (!item || item.hidden) throw new Error("gone");
      if (item.stock !== null && item.stock <= 0) throw new Error("sold_out");

      const [balanceRow] = await tx
        .select({ total: sql<number>`coalesce(sum(${beansLedger.delta}), 0)::int` })
        .from(beansLedger)
        .where(eq(beansLedger.userSub, user.sub));

      if ((balanceRow?.total ?? 0) < item.cost) throw new Error("too_poor");

      if (item.stock !== null) {
        const taken = await tx
          .update(items)
          .set({ stock: sql`${items.stock} - 1` })
          .where(and(eq(items.id, item.id), gt(items.stock, 0)))
          .returning({ id: items.id });
        if (taken.length === 0) throw new Error("sold_out");
      }

      const [order] = await tx
        .insert(orders)
        .values({
          userSub: user.sub,
          itemId: item.id,
          itemName: item.name,
          cost: item.cost,
          fullName: body.fullName?.trim(),
          email: body.email?.trim().toLowerCase(),
          addressLine1: body.addressLine1?.trim(),
          addressLine2: body.addressLine2?.trim() || null,
          city: body.city?.trim(),
          postcode: body.postcode?.trim(),
          country: body.country?.trim(),
        })
        .returning({ id: orders.id });

      await tx.insert(beansLedger).values({
        userSub: user.sub,
        delta: -item.cost,
        reason: "purchase",
        note: item.name,
      });

      return order.id;
    });

    return NextResponse.json({ ok: true, id: orderId });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "failed";

    if (reason === "gone") return NextResponse.json({ error: "gone" }, { status: 404 });
    if (reason === "sold_out") {
      return NextResponse.json(
        { error: "sold_out", message: "Someone got the last one just before you." },
        { status: 409 },
      );
    }
    if (reason === "too_poor") {
      return NextResponse.json(
        { error: "too_poor", message: "You do not have enough beans for that." },
        { status: 409 },
      );
    }

    console.error("[orders] could not place order", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
