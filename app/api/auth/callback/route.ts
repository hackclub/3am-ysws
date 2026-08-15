import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { exchangeCode } from "@/lib/auth/hca";
import { OAUTH_STATE_COOKIE, parseOAuthState } from "@/lib/auth/oauth-state";

export const dynamic = "force-dynamic";

function clearState(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

function failed(request: NextRequest, reason: string) {
  const url = new URL("/login", request.nextUrl.origin);
  url.searchParams.set("error", reason);
  return clearState(NextResponse.redirect(url));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const denied = params.get("error");

  const expected = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const { nonce, returnTo } = parseOAuthState(params.get("state"));
  const stateMatches = Boolean(expected) && nonce === expected;

  if (denied) return failed(request, "denied");
  if (!code) return failed(request, "no_code");
  if (!stateMatches) {
    console.error("[auth] state mismatch on callback, refusing to sign in");
    return failed(request, "state");
  }

  try {
    await exchangeCode(code);
  } catch (error) {
    console.error("[auth] token exchange failed", error);
    return failed(request, "exchange");
  }

  return clearState(NextResponse.redirect(new URL(returnTo ?? "/dash", request.nextUrl.origin)));
}
