import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { isCertificateOrder } from "@/lib/certificates";

export const metadata: Metadata = { title: "verify certificate" };
export const dynamic = "force-dynamic";

export default async function VerifyCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await getDb().select({ order: orders, user: users }).from(orders).innerJoin(users, eq(users.sub, orders.userSub)).where(eq(orders.id, id)).limit(1);
  const valid = Boolean(row && row.order.status === "posted" && isCertificateOrder(row.order.itemName));
  const recipient = valid ? row!.order.fullName?.trim() || row!.user.name : null;
  const issuedAt = valid ? row!.order.fulfilledAt ?? row!.order.createdAt : null;
  return <main style={{ minHeight: "100vh", background: "#11101d", color: "#f7f4ec", display: "grid", placeItems: "center", padding: 24, fontFamily: "Arial,sans-serif" }}>
    <section style={{ maxWidth: 620, width: "100%", border: "1px solid #c8a65b", padding: 32, background: "#191827" }}>
      <p style={{ letterSpacing: 4, color: "#c8a65b", fontSize: 13 }}>3AM • HACK CLUB</p>
      <h1 style={{ fontFamily: "Georgia,serif", fontSize: 34 }}>{valid ? "Certificate verified" : "Certificate not found"}</h1>
      <p style={{ color: valid ? "#8be0aa" : "#ff9e9e" }}>{valid ? "This certificate matches a fulfilled 3AM Certificate order." : "This certificate ID is invalid, or the certificate has not been issued."}</p>
      {valid ? <dl style={{ lineHeight: 2 }}>
        <dt style={{ color: "#aaa7b6" }}>Recipient</dt><dd>{recipient}</dd>
        <dt style={{ color: "#aaa7b6" }}>Certificate ID</dt><dd>{"3AM-" + row!.order.id.slice(0, 8).toUpperCase()}</dd>
        <dt style={{ color: "#aaa7b6" }}>Issue date</dt><dd>{issuedAt!.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</dd>
        <dt style={{ color: "#aaa7b6" }}>Status</dt><dd>Valid</dd>
      </dl> : null}
      <p style={{ marginTop: 28 }}><Link href="/" style={{ color: "#e4cb82" }}>Back to 3AM</Link></p>
    </section>
  </main>;
}