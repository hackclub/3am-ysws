import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  readSessionToken,
} from "./session-token";
import type { Session } from "./session-token";

export { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken, readSessionToken };
export type { Session };

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export function cookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function setSession(response: NextResponse, sub: string): Promise<NextResponse> {
  response.cookies.set(SESSION_COOKIE, await createSessionToken(sub), {
    ...cookieOptions(),
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

export function clearSession(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  return response;
}
