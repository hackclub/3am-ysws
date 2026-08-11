import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/shop?error=no_code", req.url));
  }

  const tokenRes = await fetch("https://auth.hackclub.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.HCA_CLIENT_ID,
      client_secret: process.env.HCA_CLIENT_SECRET,
      redirect_uri: process.env.HCA_REDIRECT_URI,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/shop?error=token_exchange", req.url));
  }

  const tokenData = await tokenRes.json();

  const meRes = await fetch("https://auth.hackclub.com/api/v1/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!meRes.ok) {
    return NextResponse.redirect(new URL("/shop?error=me_fetch", req.url));
  }

  const me = await meRes.json();
  const email = me.identity?.primary_email;
  const firstName = (me.identity?.first_name || "").trim();
  const lastName = (me.identity?.last_name || "").trim();
  const name = `${firstName} ${lastName}`.trim();

  if (!email) {
    return NextResponse.redirect(new URL("/shop?error=no_email", req.url));
  }

  await setSession(email, name);

  return NextResponse.redirect(new URL("/shop", req.url));
}
