import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { isCertificateOrder } from "@/lib/certificates";

export const dynamic = "force-dynamic";
function esc(v: string) { return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }
function appUrl(path: string): string | null {
  try { const base = new URL(process.env.APP_URL ?? ""); if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname))) return null; const url = new URL(path, base); return url.origin === base.origin ? url.toString() : null; } catch { return null; }
}
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await getDb().select({ order: orders, user: users }).from(orders).innerJoin(users, eq(users.sub, orders.userSub)).where(eq(orders.id, id)).limit(1);
  if (!row || row.order.status !== "posted" || !isCertificateOrder(row.order.itemName)) return NextResponse.json({ error: "certificate_not_found" }, { status: 404 });
  const verifyUrl = appUrl("/certificates/verify/" + row.order.id);
  if (!verifyUrl) return NextResponse.json({ error: "app_url_not_configured" }, { status: 503 });
  let qrDataUri = "";
  try {
    const qrUrl = new URL("https://api.qrserver.com/v1/create-qr-code/");
    qrUrl.searchParams.set("size", "240x240"); qrUrl.searchParams.set("format", "png"); qrUrl.searchParams.set("data", verifyUrl);
    const response = await fetch(qrUrl, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("QR provider failed");
    qrDataUri = "data:image/png;base64," + Buffer.from(await response.arrayBuffer()).toString("base64");
  } catch { return NextResponse.json({ error: "qr_generation_failed" }, { status: 503 }); }
  const recipient = esc(row.order.fullName?.trim() || row.user.name || "3AM Maker");
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(row.order.fulfilledAt ?? row.order.createdAt);
  const certId = "3AM-" + row.order.id.slice(0, 8).toUpperCase();
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1600" height="1100" viewBox="0 0 1600 1100">
<defs><linearGradient id="paper"><stop stop-color="#fffdf6"/><stop offset="1" stop-color="#f2eddf"/></linearGradient></defs>
<rect width="1600" height="1100" fill="#11101d"/><rect x="28" y="28" width="1544" height="1044" fill="url(#paper)"/><rect x="48" y="48" width="1504" height="1004" fill="none" stroke="#17203c" stroke-width="3"/><rect x="62" y="62" width="1476" height="976" fill="none" stroke="#c8a65b" stroke-width="2"/>
<path d="M48 220 L220 48 M48 260 L260 48 M1552 840 L1380 1012 M1552 800 L1340 1012" stroke="#c8a65b" stroke-width="5"/>
<text x="800" y="180" text-anchor="middle" font-family="Georgia,serif" font-size="30" letter-spacing="10" fill="#17203c">3AM • HACK CLUB</text><text x="800" y="330" text-anchor="middle" font-family="Georgia,serif" font-size="72" fill="#17203c">Certificate of Completion</text><path d="M510 370 H1090" stroke="#c8a65b" stroke-width="3"/>
<text x="800" y="430" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" fill="#4b4a51">This certificate is proudly presented to</text><text x="800" y="535" text-anchor="middle" font-family="Georgia,serif" font-size="64" font-weight="bold" fill="#17203c">${recipient}</text>
<text x="800" y="600" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" fill="#4b4a51">In recognition of being part of the 3AM maker community.</text><text x="800" y="648" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" fill="#4b4a51">Keep building, keep learning, and keep shipping.</text>
<circle cx="290" cy="790" r="64" fill="#c8a65b" stroke="#9d7a32" stroke-width="4"/><circle cx="290" cy="790" r="51" fill="none" stroke="#f7edc9" stroke-width="2"/><text x="290" y="782" text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="#17203c">3AM</text><text x="290" y="808" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#17203c">VERIFIED</text>
<path d="M520 800 H770" stroke="#17203c" stroke-width="2"/><text x="645" y="840" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="#17203c">3AM Team</text><text x="645" y="870" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="#777">Authorized issuer</text>
<image x="1240" y="730" width="180" height="180" xlink:href="${qrDataUri}"/><text x="1330" y="935" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" fill="#17203c">SCAN TO VERIFY</text><text x="800" y="980" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" fill="#4b4a51">Issued ${esc(date)} • ${certId}</text></svg>`;
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Content-Disposition": `attachment; filename="3AM-${row.order.id.slice(0, 8)}.svg"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}