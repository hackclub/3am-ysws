import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "3am_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type Session = { sub: string };

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken(sub: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

export async function readSessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" && payload.sub.length > 0 ? { sub: payload.sub } : null;
  } catch {
    return null;
  }
}
