import { cookies } from "next/headers";
import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET!;
const COOKIE_NAME = "shop_session";

function sign(value: string) {
  const hmac = crypto.createHmac("sha256", SECRET).update(value).digest("hex");
  return `${value}.${hmac}`;
}

function verify(signed: string): string | null {
  const [value, hmac] = signed.split(".");
  if (!value || !hmac) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(value).digest("hex");
  if (hmac !== expected) return null;
  return value;
}

export async function setSession(email: string, name: string) {
  const payload = Buffer.from(JSON.stringify({ email, name })).toString("base64url");
  const signed = sign(payload);
  const store = await cookies();
  store.set(COOKIE_NAME, signed, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSession(): Promise<{ email: string; name: string } | null> {
  const store = await cookies();
  const signed = store.get(COOKIE_NAME)?.value;
  if (!signed) return null;
  const payload = verify(signed);
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
