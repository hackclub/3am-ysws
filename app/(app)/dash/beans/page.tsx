import { desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { requireOrganizer } from "@/lib/auth/organizer";
import { getDb } from "@/lib/db";
import { beansLedger, users } from "@/lib/db/schema";

import { Adjust } from "./Adjust";
import styles from "./Adjust.module.css";

export const metadata: Metadata = { title: "beans" };
export const dynamic = "force-dynamic";

const WHEN = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function BeansPage({
  searchParams,
}: {
  searchParams: Promise<{ maker?: string }>;
}) {
  if (!(await requireOrganizer())) notFound();

  const { maker } = await searchParams;
  const db = getDb();

  const makers = await db
    .select({
      sub: users.sub,
      name: users.name,
      slackId: users.slackId,
      balance: sql<number>`coalesce((
        select sum(${beansLedger.delta}) from ${beansLedger}
        where ${beansLedger.userSub} = ${users.sub}
      ), 0)::int`,
    })
    .from(users)
    .orderBy(users.name);

  const chosen = makers.find((entry) => entry.sub === maker) ?? null;

  const entries = chosen
    ? await db
        .select()
        .from(beansLedger)
        .where(eq(beansLedger.userSub, chosen.sub))
        .orderBy(desc(beansLedger.id))
    : [];

  return (
    <AppShell title="beans">
      <Panel>
        <PanelLabel>{makers.length === 1 ? "1 maker" : `${makers.length} makers`}</PanelLabel>
        <div className={styles.list}>
          {makers.map((entry) => (
            <Link
              key={entry.sub}
              href={`/dash/beans?maker=${encodeURIComponent(entry.sub)}`}
              className={[styles.maker, entry.sub === chosen?.sub ? styles.on : null]
                .filter(Boolean)
                .join(" ")}
            >
              <span>
                <span className={styles.name}>{entry.name}</span>
                <span className={styles.sub}>{entry.slackId}</span>
              </span>
              <span className={styles.balance}>{entry.balance}</span>
            </Link>
          ))}
        </div>
      </Panel>

      {chosen ? (
        <>
          <Panel>
            <PanelLabel>adjust {chosen.name}</PanelLabel>
            <Adjust userSub={chosen.sub} name={chosen.name} />
          </Panel>

          <Panel>
            <PanelLabel>their ledger</PanelLabel>
            {entries.length === 0 ? (
              <p className={styles.none}>Nothing yet.</p>
            ) : (
              <div>
                {entries.map((entry) => (
                  <div key={entry.id} className={styles.entry}>
                    <span
                      className={[styles.delta, entry.delta > 0 ? styles.up : styles.down].join(
                        " ",
                      )}
                    >
                      {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                    </span>
                    <span className={styles.why}>
                      {entry.reason}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </span>
                    <span className={styles.when}>{WHEN.format(entry.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      ) : null}
    </AppShell>
  );
}
