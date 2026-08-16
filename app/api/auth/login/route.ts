import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authorizeUrl } from "@/lib/auth/hca";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE,
  createOAuthState,
  safeReturnTo,
} from "@/lib/auth/oauth-state";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("next"));
  const { nonce, state } = createOAuthState(returnTo);

  const response = NextResponse.redirect(authorizeUrl(state));
  response.cookies.set(OAUTH_STATE_COOKIE, nonce, {
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
