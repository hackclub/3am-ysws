import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { clearSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/goodbye", request.nextUrl.origin), 303);
  return clearSession(response);
}
