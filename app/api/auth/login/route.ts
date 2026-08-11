import { NextResponse } from "next/server";

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.HCA_CLIENT_ID!,
    redirect_uri: process.env.HCA_REDIRECT_URI!,
    response_type: "code",
    scope: "openid profile email name",
  });

  return NextResponse.redirect(
    `https://auth.hackclub.com/oauth/authorize?${params.toString()}`
  );
}
