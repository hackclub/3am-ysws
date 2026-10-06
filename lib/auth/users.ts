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

export class BannedUserError extends Error {
  constructor(
    public readonly reason: string,
    public readonly email: string,
    public readonly sub: string,
  ) {
    super("this account is banned");
    this.name = "BannedUserError";
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
  const db = getDb();

  const [emailBan] = await db
    .select({ reason: users.banReason, email: users.email, sub: users.sub })
    .from(users)
    .where(and(eq(users.email, row.email), sql`${users.bannedAt} is not null`))
    .limit(1);

  if (emailBan?.reason) {
    throw new BannedUserError(emailBan.reason, emailBan.email, emailBan.sub);
  }

  const keepLegalName = {
    ...(firstName ? { firstName: sql`coalesce(${users.firstName}, ${firstName})` } : {}),
    ...(lastName ? { lastName: sql`coalesce(${users.lastName}, ${lastName})` } : {}),
  };

  const adopted = await db
    .update(users)
    .set({ ...row, ...keepLegalName })
    .where(and(eq(users.slackId, row.slackId), ne(users.sub, row.sub)))
    .returning({ sub: users.sub });

  if (adopted.length > 0) return row;

  const [existing] = await db
    .select({ bannedAt: users.bannedAt, banReason: users.banReason })
    .from(users)
    .where(eq(users.sub, row.sub))
    .limit(1);

  if (existing?.bannedAt) {
    throw new BannedUserError(
      existing.banReason ?? "Account access was suspended.",
      row.email,
      row.sub,
    );
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
  const user = rows[0] ?? null;
  if (user?.bannedAt) return null;
  return user;
}
