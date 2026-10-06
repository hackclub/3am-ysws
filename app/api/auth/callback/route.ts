import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { publicUrl } from "@/lib/http";
import { BannedUserError, MissingIdentityError, upsertUser } from "@/lib/auth/users";
import { exchangeCode } from "@/lib/auth/hca";
import { verifyIdToken } from "@/lib/auth/id-token";
import { OAUTH_STATE_COOKIE, parseOAuthState } from "@/lib/auth/oauth-state";
import { setSession } from "@/lib/auth/session";

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

  if (denied) return failed(request, "denied");
  if (!code) return failed(request, "no_code");

  if (!Boolean(expected) || nonce !== expected) {
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

  if (!idToken) return failed(request, "no_identity");

  try {
    const claims = await verifyIdToken(idToken);
    const user = await upsertUser(claims);
    const response = NextResponse.redirect(publicUrl(request, returnTo ?? "/dash"));
    return clearState(await setSession(response, user.sub));
  } catch (error) {
    if (error instanceof BannedUserError) {
      const response = NextResponse.redirect(publicUrl(request, "/ban"));
      response.headers.set("Cache-Control", "no-store");
      // Keep the banned account identifiable so /ban can show its stored reason.
      return clearState(await setSession(response, error.sub));
    }

    if (error instanceof MissingIdentityError) {
      return failed(request, `missing_${error.field}`);
    }

    console.error("[auth] could not establish identity", error);
    return failed(request, "identity");
  }
}
