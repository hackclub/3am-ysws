import { desc, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { requireOrganizer } from "@/lib/auth/organizer";
import { getDb } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";

import { Queue } from "./Queue";
import styles from "./Queue.module.css";

export const metadata: Metadata = { title: "fulfilment" };
export const dynamic = "force-dynamic";

const FILTERS: Record<string, { label: string; statuses?: string[] }> = {
  open: { label: "to pack", statuses: ["placed", "needs_address", "packing"] },
  posted: { label: "posted", statuses: ["posted"] },
  cancelled: { label: "cancelled", statuses: ["cancelled"] },
  all: { label: "everything" },
};

export default async function FulfilmentPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  if (!(await requireOrganizer())) notFound();

  const { filter } = await searchParams;
  const key = filter && FILTERS[filter] ? filter : "open";
  const active = FILTERS[key];

  const query = getDb()
    .select({ order: orders, maker: users })
    .from(orders)
    .innerJoin(users, eq(orders.userSub, users.sub))
    .orderBy(desc(orders.createdAt));

  const rows = active.statuses
    ? await query.where(
        inArray(orders.status, active.statuses as ("placed" | "posted" | "cancelled")[]),
      )
    : await query;

  return (
    <AppShell title="fulfilment">
      <nav className={styles.filters} aria-label="filter orders">
        {Object.entries(FILTERS).map(([id, option]) => (
          <Link
            key={id}
            href={`/dash/fulfilment?filter=${id}`}
            className={[styles.filter, id === key ? styles.on : null].filter(Boolean).join(" ")}
            aria-current={id === key ? "page" : undefined}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      <Panel>
        <PanelLabel>{rows.length === 1 ? "1 order" : `${rows.length} orders`}</PanelLabel>
        <Queue rows={rows} />
      </Panel>
    </AppShell>
  );
}
