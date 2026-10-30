import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { isCertificateOrder } from "@/lib/certificates";

export const dynamic = "force-dynamic";
function esc(v: string) { return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/’/g, "&apos;"); }
function appUrl(path: string): string | null {
  try { const base = new URL(process.env.APP_URL ?? ""); if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname))) return null; const url = new URL(path, base); return url.origin === base.origin ? url.toString() : null; } catch { return null; }
}

 // Returns the organizer’s display name from the env, with a safe fallback.
function signerName(): { cursive: string; caps: string } {
  const raw = process.env.CERTIFICATE_SIGNER_NAME?.trim();
  const name = raw && raw.length > 0 ? raw : "Hack Club";
  return { cursive: esc(name), caps: esc(name.toUpperCase()) };
}
async function fetchQrDataUri(data: string): Promise<string | null> {
  try {
    const qrUrl = new URL("https://api.qrserver.com/v1/create-qr-code/");
    qrUrl.searchParams.set("size", "240x240");
    qrUrl.searchParams.set("format", "png");
    qrUrl.searchParams.set("data", data);
    const response = await fetch(qrUrl, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    return "data:image/png;base64," + Buffer.from(await response.arrayBuffer()).toString("base64");
  } catch { return null; }
}
function qrFallbackSvg(verifyUrl: string): string {
  const short = esc(verifyUrl.replace(/^https?:\/\//, "").slice(0, 40));
  return [
    `<rect width="76" height="76" rx="3" fill="#fff" stroke="#f7edcf" stroke-width="3"/>`,
    `<rect x="6" y="6" width="20" height="20" fill="#050505"/><rect x="9" y="9" width="14" height="14" fill="#fff"/><rect x="12" y="12" width="8" height="8" fill="#050505"/>`,
    `<rect x="50" y="6" width="20" height="20" fill="#050505"/><rect x="53" y="9" width="14" height="14" fill="#fff"/><rect x="56" y="12" width="8" height="8" fill="#050505"/>`,
    `<rect x="6" y="50" width="20" height="20" fill="#050505"/><rect x="9" y="53" width="14" height="14" fill="#fff"/><rect x="12" y="56" width="8" height="8" fill="#050505"/>`,
    `<text x="38" y="42" text-anchor="middle" font-family="Arial,sans-serif" font-size="5" fill="#050505">${short}</text>`,
  ].join("");
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await getDb().select({ order: orders, user: users }).from(orders).innerJoin(users, eq(users.sub, orders.userSub)).where(eq(orders.id, id)).limit(1);
  if (!row || row.order.status !== "posted" || !isCertificateOrder(row.order.itemName)) return NextResponse.json({ error: "certificate_not_found" }, { status: 404 });
  const verifyUrl = appUrl("/certificates/verify/" + row.order.id);
  if (!verifyUrl) return NextResponse.json({ error: "app_url_not_configured" }, { status: 503 });
  const qrDataUri = await fetchQrDataUri(verifyUrl);
  const qrBlock = qrDataUri
    ? `<rect width="76" height="76" rx="3" fill="#fff" stroke="#f7edcf" stroke-width="3"/><image x="3" y="3" width="70" height="70" xlink:href="${qrDataUri}"/>`
    : qrFallbackSvg(verifyUrl);
  const recipient = esc(row.order.fullName?.trim() || row.user.name || "3AM Maker");
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(row.order.fulfilledAt ?? row.order.createdAt);
  const certId = "3AM-" + row.order.id.slice(0, 8).toUpperCase();
  const signer = signerName();
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1536" height="1152" viewBox="0 0 1024 768">
<rect width="1024" height="768" fill="#050505"/>
<g fill="#fff8dc"><circle cx="52" cy="38" r="1.6"/><circle cx="170" cy="24" r="1.2"/><circle cx="220" cy="34" r="1.5"/><circle cx="878" cy="28" r="1.6"/><circle cx="970" cy="140" r="1.7"/><circle cx="28" cy="500" r="1.4"/><circle cx="990" cy="540" r="1.4"/><circle cx="180" cy="730" r="1.5"/><circle cx="940" cy="720" r="1.5"/><circle cx="320" cy="14" r="1"/><circle cx="700" cy="24" r="1"/></g>
<g fill="#ffdf35"><path d="M68 0 Q70 42 110 50 Q70 55 68 100 Q62 56 22 50 Q62 42 68 0Z"/><path d="M266 748 Q268 765 286 768 Q268 770 266 786 Q264 770 248 768 Q264 765 266 748Z"/><path d="M990 650 Q992 667 1008 670 Q992 672 990 689 Q988 672 972 670 Q988 667 990 650Z"/></g>
<rect x="74" y="61" width="878" height="630" rx="12" fill="#430e0d" stroke="#f7f2e7" stroke-width="3"/>
<rect x="80" y="67" width="866" height="618" rx="8" fill="none" stroke="#f7f2e7" stroke-width="1"/>
<g fill="#fff"><path d="M140 24 l3 10 10 3 -10 3 -3 10 -3 -10 -10 -3 10 -3Z"/><path d="M916 35 l3 10 10 3 -10 3 -3 10 -3 -10 -10 -3 10 -3Z"/><path d="M40 610 l3 10 10 3 -10 3 -3 10 -3 -10 -10 -3 10 -3Z"/><path d="M984 380 l3 10 10 3 -10 3 -3 10 -3 -10 -10 -3 10 -3Z"/></g>
<g transform="translate(352 92)"><path d="M0 0 Q22 -18 46 -2 Q70 10 96 -5 L90 28 Q66 42 44 26 Q20 12 0 30Z" fill="#f7edcf"/><text x="48" y="20" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="#151515" transform="rotate(-4 48 20)">HACK CLUB</text></g>
<text x="510" y="124" font-family="Georgia,serif" font-size="32" font-weight="bold" fill="#f7edcf">| 3am</text>
<text x="512" y="190" text-anchor="middle" font-family="Georgia,serif" font-size="29" letter-spacing="4" fill="#f7edcf">CERTIFICATE OF APPRECIATION</text>
<path d="M130 185 A40 40 0 1 1 174 225 A31 31 0 0 0 130 185Z" fill="#f2d447"/>
<text x="512" y="240" text-anchor="middle" font-family="Georgia,serif" font-size="22" letter-spacing="3" fill="#f7edcf">This certificate is proudly presented to</text>
<rect x="230" y="265" width="564" height="62" fill="#430e0d"/>
<text x="512" y="315" text-anchor="middle" font-family="Arial,sans-serif" font-size="36" fill="#f7f3ee">${recipient}</text>
<path d="M206 329 H818" stroke="#f7f2e7" stroke-width="2"/>
<text x="512" y="373" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="#f7edcf">in recognition of submitting projects to 3AM and enthusiastic</text>
<text x="512" y="408" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="#f7edcf">participation to Hack Club’s worldwide community of</text>
<text x="512" y="441" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="#f7edcf">developers.</text>
<text x="512" y="489" text-anchor="middle" font-family="cursive" font-size="36" fill="#d8b7b6">${signer.cursive}</text><path d="M398 497 H626" stroke="#d8b7b6" stroke-width="1.5"/>
<text x="512" y="526" text-anchor="middle" font-family="Georgia,serif" font-size="23" fill="#ffdf35">${signer.caps}</text><text x="512" y="549" text-anchor="middle" font-family="Georgia,serif" font-size="14" fill="#f7edcf">ORGANIZER</text>
<g transform="translate(846 555)">${qrBlock}</g>
<text x="884" y="647" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" fill="#f7edcf">SCAN TO VERIFY</text>
<text x="510" y="650" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#e8cfc6">Issued ${esc(date)} • ${certId}</text>
<g fill="#d62e35"><ellipse cx="900" cy="260" rx="13" ry="22" transform="rotate(28 900 260)"/><ellipse cx="142" cy="532" rx="13" ry="22" transform="rotate(-50 142 532)"/><ellipse cx="830" cy="650" rx="13" ry="22" transform="rotate(35 830 650)"/></g>
</svg>`;
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Content-Disposition": `attachment; filename="3AM-${row.order.id.slice(0, 8)}.svg"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}