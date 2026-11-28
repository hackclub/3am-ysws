import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { requireOrganizer } from "@/lib/auth/organizer";
import { getDb } from "@/lib/db";
import { manualShipments, orders, users } from "@/lib/db/schema";
import { toShipmentView } from "@/lib/fulfilment/manual-shipments";

import { FulfilmentOverview } from "../Overview";
import { Queue } from "../Queue";
import styles from "../Queue.module.css";
import { ManualShipments } from "./ManualShipments";

export const metadata: Metadata = { title: "sticker & swag fulfilment" };
export const dynamic = "force-dynamic";

// Match current and legacy product labels without pulling in unrelated apparel.
const STICKER_OR_SWAG = /sticker|swag[\s-]*kit|3am[\s-]*(?:swag|kit)/i;
const MANUAL_LIMIT = 300;

export default async function StickerFulfilmentPage() {
  if (!(await requireOrganizer())) notFound();

  const db = getDb();
  const [allRows, manualRows] = await Promise.all([
    db.select({ order: orders, maker: users })
      .from(orders)
      .innerJoin(users, eq(orders.userSub, users.sub))
      .orderBy(desc(orders.createdAt)),
    db.select().from(manualShipments).orderBy(desc(manualShipments.createdAt)).limit(MANUAL_LIMIT),
  ]);

  const rows = allRows.filter(({ order }) => STICKER_OR_SWAG.test(order.itemName));

  return (
    <AppShell title="sticker & swag fulfilment">
      <FulfilmentOverview />
      <nav className={styles.filters} aria-label="fulfilment dashboards">
        <Link href="/dash/fulfilment" className={styles.filter}>shop orders</Link>
        <Link href="/dash/fulfilment/stickers" className={[styles.filter, styles.on].join(" ")} aria-current="page">stickers, swag & manual shipments</Link>
      </nav>
      <ManualShipments shipments={manualRows.map(toShipmentView)} limit={MANUAL_LIMIT} />
      <Panel>
        <PanelLabel>{rows.length === 1 ? "1 matching shop order" : `${rows.length} matching shop orders`} · includes posted history</PanelLabel>
        <Queue rows={rows} />
      </Panel>
    </AppShell>
  );
}
