import { desc, eq, notInArray, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { StatCard } from "@/components/ui/StatCard";
import { RowLink, RowText } from "@/components/ui/Row";
import { ProjectStatusWord } from "@/components/ui/StatusWord";
import { getCurrentUser } from "@/lib/auth/users";
import { isOrganizer } from "@/lib/auth/organizer";
import { getDb } from "@/lib/db";
import {
  beansLedger,
  orders,
  projects,
  reviewerLedger,
  reviewers,
  users,
} from "@/lib/db/schema";
import { isOpen, projectStatus } from "@/lib/projects/status";
import { beansForMinutes, hoursLabel } from "@/lib/beans";
import { leaderboard } from "@/lib/reviewers";
import { openInvoices } from "@/lib/reviewers/invoices";
import { readApproved } from "@/lib/ysws/submissions";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "tonight" };
export const dynamic = "force-dynamic";

const WHEN = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const WHEN_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fdash");

  if (isOrganizer(user)) {
    const db = getDb();
    const [
      circulationRows,
      projectCounts,
      pendingOrderRows,
      recentOrders,
      invoices,
      topReviewers,
      recentReviews,
      approvedRows,
    ] = await Promise.all([
      db.select({ total: sql<number>`coalesce(sum(${beansLedger.delta}), 0)` }).from(beansLedger),
      db.select({
        total: sql<number>`count(*)::int`,
        received: sql<number>`count(*) filter (where ${projects.submittedAt} is not null and ${projects.decision} is null)::int`,
        approved: sql<number>`count(*) filter (where ${projects.decision} = 'approved')::int`,
        changes: sql<number>`count(*) filter (where ${projects.decision} = 'changes')::int`,
      }).from(projects),
      db.select({ total: sql<number>`count(*)::int` }).from(orders)
        .where(notInArray(orders.status, ["posted", "cancelled"])),
      db.select({
        order: orders,
        makerName: users.name,
      }).from(orders)
        .innerJoin(users, eq(users.sub, orders.userSub))
        .orderBy(desc(orders.createdAt))
        .limit(6),
      openInvoices(),
      leaderboard("all"),
      db.select({
        id: reviewerLedger.id,
        projectId: reviewerLedger.projectId,
        title: projects.title,
        reviewerName: reviewers.name,
        decision: reviewerLedger.decision,
        approvedMinutes: reviewerLedger.approvedMinutes,
        createdAt: reviewerLedger.createdAt,
      }).from(reviewerLedger)
        .innerJoin(reviewers, eq(reviewers.id, reviewerLedger.reviewerId))
        .leftJoin(projects, eq(projects.id, reviewerLedger.projectId))
        .where(eq(reviewerLedger.kind, "review"))
        .orderBy(desc(reviewerLedger.createdAt), desc(reviewerLedger.id))
        .limit(7),
      readApproved(),
    ]);

    const circulation = Number(circulationRows[0]?.total ?? 0);
    const counts = projectCounts[0] ?? { total: 0, received: 0, approved: 0, changes: 0 };
    const pendingOrders = Number(pendingOrderRows[0]?.total ?? 0);
    const unifiedWaiting = approvedRows.filter((row) => row.state !== "sent");
    const invoiceTotal = invoices.reduce((sum, row) => sum + Number(row.invoice.amount), 0);
    const owl = <Image src="/assets/owl.png" alt="" width={48} height={48} className="pixel" unoptimized />;

    return (
      <AppShell title="overview" action={<ButtonLink href="/dash/ships">review submissions</ButtonLink>}>
        <div className={styles.welcome}>
          <div>
            <p className={styles.eyebrow}>3AM · ORGANIZER DESK</p>
            <h2>Everything, at a glance.</h2>
            <p className={styles.muted}>The important numbers, queues, and recent activity in one place.</p>
          </div>
          {owl}
        </div>

        <div className={styles.cards}>
          <StatCard accent label="beans in circulation" value={circulation.toLocaleString("en-US")} sub="total maker balances" />
          <StatCard label="projects received" value={counts.received} sub="waiting for review" />
          <StatCard label="approved projects" value={counts.approved} sub="all-time approvals" />
          <StatCard label="not sent to Unified" value={unifiedWaiting.length} sub="approved · needs a push or retry" />
          <StatCard label="open orders" value={pendingOrders} sub="not posted or cancelled" />
          <StatCard label="review pay in process" value={invoices.length} sub={invoiceTotal ? `$${invoiceTotal.toFixed(2)} USD requested` : "no outstanding invoices"} />
        </div>

        <div className={styles.columns}>
          <Panel>
            <div className={styles.panelHead}>
              <PanelLabel>approved · not yet sent to Unified</PanelLabel>
              <Link href="/dash/unified" className={styles.panelLink}>open Unified →</Link>
            </div>
            {unifiedWaiting.length === 0 ? <p className={styles.none}>Everything approved has been sent to Unified.</p> : (
              <div className={styles.list}>
                {unifiedWaiting.slice(0, 7).map((row) => (
                  <RowLink key={row.projectId} href="/dash/unified">
                    <RowText name={row.title} meta={`${row.maker} · approved ${row.decidedAt ? WHEN.format(row.decidedAt) : "date unknown"}`} />
                    <span className={styles.status}>{row.state === "error" ? "send failed" : row.state === "held" ? "blocked" : row.state === "queued" ? "queued" : "not sent"}</span>
                  </RowLink>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <div className={styles.panelHead}>
              <PanelLabel>review pay · invoices</PanelLabel>
              <Link href="/dash/reviewers" className={styles.panelLink}>manage pay →</Link>
            </div>
            {invoices.length === 0 ? <p className={styles.none}>No reviewer invoices waiting for action.</p> : (
              <div className={styles.list}>
                {invoices.slice(0, 6).map(({ invoice, name }) => (
                  <RowLink key={invoice.id} href="/dash/reviewers">
                    <RowText name={name} meta={`requested ${WHEN.format(invoice.requestedAt)}`} />
                    <span className={styles.amount}>${Number(invoice.amount).toFixed(2)}</span>
                  </RowLink>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className={styles.columns}>
          <Panel>
            <div className={styles.panelHead}>
              <PanelLabel>latest orders</PanelLabel>
              <Link href="/dash/fulfilment" className={styles.panelLink}>fulfilment →</Link>
            </div>
            {recentOrders.length === 0 ? <p className={styles.none}>No orders yet.</p> : (
              <div className={styles.list}>
                {recentOrders.map(({ order, makerName }) => (
                  <RowLink key={order.id} href="/dash/fulfilment">
                    <RowText name={order.itemName} meta={`${makerName} · ${WHEN_TIME.format(order.createdAt)}`} />
                    <span className={styles.status}>{order.status.replaceAll("_", " ")}</span>
                  </RowLink>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <div className={styles.panelHead}>
              <PanelLabel>top reviewers · all time</PanelLabel>
              <Link href="/dash/reviewers" className={styles.panelLink}>leaderboard →</Link>
            </div>
            {topReviewers.length === 0 ? <p className={styles.none}>No reviews recorded yet.</p> : (
              <div className={styles.list}>
                {topReviewers.slice(0, 5).map((reviewer, index) => (
                  <div key={reviewer.id} className={styles.rankRow}>
                    <span className={styles.rank}>{index === 0 ? "👑" : `#${index + 1}`}</span>
                    <span className={styles.rankName}>{reviewer.name}</span>
                    <span className={styles.rankCount}>{reviewer.reviews} reviews</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <Panel>
          <div className={styles.panelHead}>
            <PanelLabel>recently reviewed</PanelLabel>
            <Link href="/dash/ships" className={styles.panelLink}>all submissions →</Link>
          </div>
          {recentReviews.length === 0 ? <p className={styles.none}>No review activity yet.</p> : (
            <div className={styles.list}>
              {recentReviews.map((review) => (
                <RowLink key={review.id} href={review.projectId ? `/dash/ships/${review.projectId}` : "/dash/ships"}>
                  <RowText name={review.title ?? "Project no longer available"} meta={`${review.reviewerName} · ${review.decision ?? "reviewed"} · ${WHEN_TIME.format(review.createdAt)}`} />
                  <span className={styles.status}>{hoursLabel(review.approvedMinutes ?? 0)}</span>
                </RowLink>
              ))}
            </div>
          )}
        </Panel>
      </AppShell>
    );
  }

  const mine = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.userSub, user.sub))
    .orderBy(desc(projects.createdAt));

  const owl = (
    <Image src="/assets/owl.png" alt="" width={64} height={64} className="pixel" unoptimized />
  );

  if (mine.length === 0) {
    return (
      <AppShell title="tonight">
        {!user.hackatimeToken ? (
          <Banner tone="warn" title="connect hackatime first">
            It is how we know how long you spent. Without it you cannot pick your projects when you
            ship.
          </Banner>
        ) : null}
        <EmptyState
          art={owl}
          title="nothing here yet"
          action={
            user.hackatimeToken ? (
              <ButtonLink href="/dash/new">start a project</ButtonLink>
            ) : (
              <ButtonLink href="/dash/connect">connect Hackatime</ButtonLink>
            )
          }
        >
          Build something dark, track it in Hackatime, then send it in. The owl will wait.
        </EmptyState>
      </AppShell>
    );
  }

  const approved = mine.filter((project) => project.decision === "approved");
  const approvedMinutes = approved.reduce(
    (total, project) => total + (project.approvedMinutes ?? 0),
    0,
  );
  const beans = approved.reduce(
    (total, project) => total + beansForMinutes(project.approvedMinutes),
    0,
  );
  const waiting = mine.filter(isOpen);

  return (
    <AppShell title="tonight" action={<ButtonLink href="/dash/new">send in a project</ButtonLink>}>
      <div className={styles.cards}>
        <StatCard
          accent
          label="hours approved"
          value={hoursLabel(approvedMinutes)}
          sub={approved.length === 1 ? "across 1 project" : `across ${approved.length} projects`}
        />
        <StatCard label="beans" value={beans} sub="5 per approved hour" />
        <StatCard
          label="waiting on us"
          value={waiting.length}
          sub={waiting.length === 0 ? "nothing in the queue" : "we will message you on Slack"}
        />
      </div>
      <Panel>
        <div className={styles.head}>
          <PanelLabel>your projects</PanelLabel>
        </div>
        <div className={styles.list}>
          {mine.map((project) => (
            <RowLink key={project.id} href={`/dash/p/${project.id}`}>
              <RowText
                name={project.title}
                meta={
                  project.submittedAt
                    ? `sent ${WHEN.format(project.submittedAt)}`
                    : `started ${WHEN.format(project.createdAt)}`
                }
              />
              <ProjectStatusWord status={projectStatus(project)} />
            </RowLink>
          ))}
        </div>
      </Panel>
    </AppShell>
  );
}
