import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth/session-token";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
export const runtime = "nodejs";
export async function middleware(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const isBanPage = request.nextUrl.pathname === "/ban";
  if (session) {
    const [user] = await getDb().select({ bannedAt: users.bannedAt }).from(users).where(eq(users.sub, session.sub)).limit(1);
    if (user?.bannedAt && !isBanPage) return NextResponse.redirect(new URL("/ban", request.nextUrl.origin));
    if (!user?.bannedAt && isBanPage) return NextResponse.redirect(new URL("/dash", request.nextUrl.origin));
  }
  if (session) return NextResponse.next();
  const login = new URL("/login", request.nextUrl.origin);
  login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}
export const config = { matcher: ["/dash/:path*", "/shop/:path*", "/ban"] };