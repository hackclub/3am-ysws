import type { NextRequest } from "next/server";

export function publicOrigin(request: NextRequest): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }

  return request.nextUrl.origin;
}

export function publicUrl(request: NextRequest, path: string): URL {
  return new URL(path, publicOrigin(request));
}
