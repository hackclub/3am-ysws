import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://ships.hackclub.com/api/v1/ysws_entries", {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch from Ships API" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("API Proxy Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
