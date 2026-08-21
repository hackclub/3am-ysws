import { and, eq, ne, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

import { getSession } from "./session";

import { displayName } from "./id-token";
import type { HcaClaims } from "./id-token";

export class MissingIdentityError extends Error {
  constructor(public readonly field: "email" | "slack_id") {
    super(`claims are missing ${field}`);
    this.name = "MissingIdentityError";
  }
}

export async function upsertUser(claims: HcaClaims) {
  if (!claims.email) throw new MissingIdentityError("email");
  if (!claims.slack_id) throw new MissingIdentityError("slack_id");

  const row = {
    sub: claims.sub,
    email: claims.email.trim().toLowerCase(),
    name: displayName(claims),
    slackId: claims.slack_id.trim(),
  };

  const firstName = claims.given_name?.trim() || null;
  const lastName = claims.family_name?.trim() || null;

  const keepLegalName = {
    ...(firstName ? { firstName: sql`coalesce(${users.firstName}, ${firstName})` } : {}),
    ...(lastName ? { lastName: sql`coalesce(${users.lastName}, ${lastName})` } : {}),
  };

  const db = getDb();

  const adopted = await db
    .update(users)
    .set({ ...row, ...keepLegalName })
    .where(and(eq(users.slackId, row.slackId), ne(users.sub, row.sub)))
    .returning({ sub: users.sub });

  if (adopted.length > 0) {
    console.info(`[auth] adopted migrated account ${row.slackId} as ${row.sub}`);
    return row;
  }

  await db
    .insert(users)
    .values({ ...row, firstName, lastName })
    .onConflictDoUpdate({
      target: users.sub,
      set: { email: row.email, name: row.name, slackId: row.slackId, ...keepLegalName },
    });

  return row;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const rows = await getDb().select().from(users).where(eq(users.sub, session.sub)).limit(1);
  return rows[0] ?? null;
}
