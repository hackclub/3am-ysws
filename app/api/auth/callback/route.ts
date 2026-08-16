import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { publicUrl } from "@/lib/http";

import { exchangeCode } from "@/lib/auth/hca";
import { verifyIdToken } from "@/lib/auth/id-token";
import { OAUTH_STATE_COOKIE, parseOAuthState } from "@/lib/auth/oauth-state";
import { setSession } from "@/lib/auth/session";
import { MissingIdentityError, upsertUser } from "@/lib/auth/users";

export const dynamic = "force-dynamic";

function clearState(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

function failed(request: NextRequest, reason: string) {
  const url = publicUrl(request, "/login");
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

  let idToken: string | undefined;
  try {
    idToken = (await exchangeCode(code)).id_token;
  } catch (error) {
    console.error("[auth] token exchange failed", error);
    return failed(request, "exchange");
  }

  if (!idToken) {
    console.error("[auth] token response carried no id_token");
    return failed(request, "no_identity");
  }

  let sub: string;
  try {
    const claims = await verifyIdToken(idToken);
    sub = (await upsertUser(claims)).sub;
  } catch (error) {
    if (error instanceof MissingIdentityError) {
      return failed(request, `missing_${error.field}`);
    }
    console.error("[auth] could not establish identity", error);
    return failed(request, "identity");
  }

  const response = NextResponse.redirect(publicUrl(request, returnTo ?? "/dash"));
  return clearState(await setSession(response, sub));
}
