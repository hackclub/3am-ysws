import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

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
    slackId: claims.slack_id,
  };

  await getDb()
    .insert(users)
    .values(row)
    .onConflictDoUpdate({
      target: users.sub,
      set: { email: row.email, name: row.name, slackId: row.slackId },
    });

  return row;
}
