import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { publicUrl } from "@/lib/http";

import { appUrl } from "@/lib/auth/hca";
import { parseOAuthState } from "@/lib/auth/oauth-state";
import { getSession } from "@/lib/auth/session";
import { seal } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  HACKATIME_STATE_COOKIE,
  exchangeHackatimeCode,
  getHackatimeProfile,
  getHackatimeProjects,
} from "@/lib/hackatime/client";

export const dynamic = "force-dynamic";

function back(request: NextRequest, status: string) {
  const url = publicUrl(request, "/dash/connect");
  url.searchParams.set("status", status);
  const response = NextResponse.redirect(url);
  response.cookies.set(HACKATIME_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(publicUrl(request, "/login?next=%2Fdash%2Fconnect"));
  }

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const expected = request.cookies.get(HACKATIME_STATE_COOKIE)?.value;
  const { nonce } = parseOAuthState(params.get("state"));

  if (params.get("error")) return back(request, "denied");
  if (!code) return back(request, "failed");
  if (!expected || nonce !== expected) {
    console.error("[hackatime] state mismatch on callback");
    return back(request, "failed");
  }

  try {
    const token = await exchangeHackatimeCode(code, appUrl());
    const profile = await getHackatimeProfile(token);

    // Hackatime lets restricted accounts (trust level "red" or pending deletion)
    // read /me but answers 401 on /projects. Check now so we don't show
    // "connected" and then silently drop the token on the next page load.
    try {
      await getHackatimeProjects(token);
    } catch (error) {
      if (error instanceof Error && error.message.includes("401")) {
        console.warn(`[hackatime] account ${profile.id ?? "?"} is API-restricted on Hackatime`);
        return back(request, "restricted");
      }
      throw error;
    }

    await getDb()
      .update(users)
      .set({
        hackatimeToken: seal(token),
        hackatimeId: profile.id != null ? String(profile.id) : null,
      })
      .where(eq(users.sub, session.sub));
  } catch (error) {
    console.error("[hackatime] connect failed", error);
    return back(request, "failed");
  }

  return back(request, "connected");
}
