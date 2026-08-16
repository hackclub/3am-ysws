import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { publicUrl } from "@/lib/http";

import { clearSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  const response = NextResponse.redirect(publicUrl(request, "/goodbye"), 303);
  return clearSession(response);
}
