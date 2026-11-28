import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { requireOrganizer } from "@/lib/auth/organizer";
import { getDb } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";

import { Queue } from "../Queue";
import styles from "../Queue.module.css";

export const metadata: Metadata = { title: "sticker & swag fulfilment" };
export const dynamic = "force-dynamic";

// Match current and legacy product labels without pulling in unrelated apparel.
const STICKER_OR_SWAG = /sticker|swag[\s-]*kit|3am[\s-]*(?:swag|kit)/i;

export default async function StickerFulfilmentPage() {
  if (!(await requireOrganizer())) notFound();

  const allRows = await getDb()
    .select({ order: orders, maker: users })
    .from(orders)
    .innerJoin(users, eq(orders.userSub, users.sub))
    .orderBy(desc(orders.createdAt));

  const rows = allRows.filter(({ order }) => STICKER_OR_SWAG.test(order.itemName));

  return (
    <AppShell title="sticker & swag fulfilment">
      <nav className={styles.filters} aria-label="fulfilment dashboards">
        <Link href="/dash/fulfilment" className={styles.filter}>all fulfilment</Link>
        <Link href="/dash/fulfilment/stickers" className={[styles.filter, styles.on].join(" ")} aria-current="page">stickers & swag</Link>
      </nav>
      <Panel>
        <PanelLabel>{rows.length === 1 ? "1 matching order" : `${rows.length} matching orders`} · includes posted history</PanelLabel>
        <Queue rows={rows} />
      </Panel>
    </AppShell>
  );
}
