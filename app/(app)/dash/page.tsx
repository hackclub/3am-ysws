import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
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
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { isOpen, projectStatus } from "@/lib/projects/status";
import { beansForMinutes, hoursLabel } from "@/lib/beans";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "tonight" };
export const dynamic = "force-dynamic";

const WHEN = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fdash");

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
