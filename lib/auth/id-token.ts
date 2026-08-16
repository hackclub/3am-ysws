import { createRemoteJWKSet, jwtVerify } from "jose";

import { clientId, hcaIssuer } from "./hca";

export type HcaClaims = {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  nickname?: string;
  email?: string;
  email_verified?: boolean;
  slack_id?: string;
  verification_status?: string;
  ysws_eligible?: boolean;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function keys() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${hcaIssuer()}/oauth/discovery/keys`));
  return jwks;
}

export async function verifyIdToken(idToken: string): Promise<HcaClaims> {
  const { payload } = await jwtVerify(idToken, keys(), {
    issuer: hcaIssuer(),
    audience: clientId(),
  });

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("id_token has no sub");
  }

  return payload as HcaClaims;
}

export function displayName(claims: HcaClaims): string {
  const full = [claims.given_name, claims.family_name].filter(Boolean).join(" ").trim();
  return claims.nickname || claims.name || full || claims.email || claims.sub;
}
