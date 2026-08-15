import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { appUrl } from "@/lib/auth/hca";
import { OAUTH_STATE_MAX_AGE, createOAuthState } from "@/lib/auth/oauth-state";
import { getSession } from "@/lib/auth/session";
import { HACKATIME_STATE_COOKIE, hackatimeAuthorizeUrl } from "@/lib/hackatime/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.redirect(new URL("/login?next=%2Fdash%2Fconnect", request.nextUrl.origin));
  }

  const { nonce, state } = createOAuthState();
  const response = NextResponse.redirect(hackatimeAuthorizeUrl(state, appUrl()));
  response.cookies.set(HACKATIME_STATE_COOKIE, nonce, {
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
