import { asc, ilike, or, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { hoursLabel } from "@/lib/beans";
import { requireOrganizer } from "@/lib/auth/organizer";
import { getDb } from "@/lib/db";
import { beansLedger, orders, projects, users } from "@/lib/db/schema";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "makers" };
export const dynamic = "force-dynamic";

export default async function MakersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!(await requireOrganizer())) notFound();

  const { q } = await searchParams;
  const needle = q?.trim();

  const rows = await getDb()
    .select({
      sub: users.sub,
      name: users.name,
      email: users.email,
      slackId: users.slackId,
      hackatime: sql<boolean>`${users.hackatimeToken} is not null`,
      sent: sql<number>`(
        select count(*) from ${projects}
        where ${projects.userSub} = ${users.sub} and ${projects.submittedAt} is not null
      )::int`,
      approvedMinutes: sql<number>`coalesce((
        select sum(${projects.approvedMinutes}) from ${projects}
        where ${projects.userSub} = ${users.sub} and ${projects.decision} = 'approved'
      ), 0)::int`,
      beans: sql<number>`coalesce((
        select sum(${beansLedger.delta}) from ${beansLedger}
        where ${beansLedger.userSub} = ${users.sub}
      ), 0)::int`,
      orderCount: sql<number>`(
        select count(*) from ${orders} where ${orders.userSub} = ${users.sub}
      )::int`,
    })
    .from(users)
    .where(
      needle
        ? or(
            ilike(users.name, `%${needle}%`),
            ilike(users.email, `%${needle}%`),
            ilike(users.slackId, `%${needle}%`),
          )
        : undefined,
    )
    .orderBy(asc(users.name));

  return (
    <AppShell title="makers">
      <Panel>
        <form className={styles.search} action="/dash/makers">
          <input
            className={styles.input}
            name="q"
            defaultValue={needle ?? ""}
            placeholder="search by name, email or slack id"
            aria-label="search makers"
          />
        </form>
      </Panel>

      <Panel>
        <PanelLabel>{rows.length === 1 ? "1 maker" : `${rows.length} makers`}</PanelLabel>
        {rows.length === 0 ? (
          <p className={styles.none}>
            {needle ? "Nobody matches that." : "Nobody has signed in yet."}
          </p>
        ) : (
          <div className={styles.wrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>maker</th>
                  <th>hackatime</th>
                  <th>sent</th>
                  <th>hours</th>
                  <th>beans</th>
                  <th>orders</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.sub}>
                    <td>
                      <Link href={`/dash/beans?maker=${encodeURIComponent(row.sub)}`}>
                        <span className={styles.name}>{row.name}</span>
                      </Link>
                      <span className={styles.sub}>
                        {row.slackId} · {row.email}
                      </span>
                    </td>
                    <td>{row.hackatime ? "yes" : "no"}</td>
                    <td>{row.sent}</td>
                    <td>{hoursLabel(row.approvedMinutes)}</td>
                    <td className={styles.beans}>{row.beans}</td>
                    <td>{row.orderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
