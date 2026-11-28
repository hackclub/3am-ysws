import { sql } from "drizzle-orm";
import Link from "next/link";

import { getDb } from "@/lib/db";
import { manualShipments, orders } from "@/lib/db/schema";

import styles from "./Overview.module.css";

type Tile = { label: string; value: number; sub: string; href: string; tone?: "warn" | "bad" };

// At-a-glance counts for both fulfilment streams. Two small grouped queries; no rows are loaded.
export async function FulfilmentOverview() {
  const db = getDb();
  const [orderCounts, manualCounts] = await Promise.all([
    db.select({ status: orders.status, n: sql<number>`count(*)::int` }).from(orders).groupBy(orders.status),
    db.select({ status: manualShipments.status, n: sql<number>`count(*)::int` }).from(manualShipments).groupBy(manualShipments.status)
      .catch(() => null), // Table missing until migration 0021 runs: show the shop numbers anyway.
  ]);

  const o = (s: string) => orderCounts.find((r) => r.status === s)?.n ?? 0;
  const m = (s: string) => manualCounts?.find((r) => r.status === s)?.n ?? 0;

  const tiles: Tile[] = [
    { label: "to pack", value: o("placed") + o("packing"), sub: "shop orders placed or packing", href: "/dash/fulfilment?filter=open" },
    { label: "needs address", value: o("needs_address"), sub: "chase the maker", href: "/dash/fulfilment?filter=open", tone: o("needs_address") ? "bad" : undefined },
    { label: "ready to fulfil", value: o("ready_to_fulfil"), sub: "packed, waiting to post", href: "/dash/fulfilment?filter=ready", tone: o("ready_to_fulfil") ? "warn" : undefined },
    { label: "shop posted", value: o("posted"), sub: "all time", href: "/dash/fulfilment?filter=posted" },
    {
      label: "manual open",
      value: m("packing") + m("posted"),
      sub: manualCounts ? `${m("packing")} packing · ${m("posted")} in transit` : "table not created yet",
      href: "/dash/fulfilment/stickers",
      tone: m("packing") ? "warn" : undefined,
    },
  ];

  return (
    <section className={styles.strip} aria-label="fulfilment overview">
      {tiles.map((t) => (
        <Link key={t.label} href={t.href} className={[styles.tile, t.tone ? styles[t.tone] : null].filter(Boolean).join(" ")}>
          <span className={styles.label}>{t.label}</span>
          <span className={styles.value}>{t.value}</span>
          <span className={styles.sub}>{t.sub}</span>
        </Link>
      ))}
    </section>
  );
}
