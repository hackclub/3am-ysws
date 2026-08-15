import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/Button";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { ProjectStatusWord } from "@/components/ui/StatusWord";
import { getDb } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";
import { ADMIN_NAV } from "@/lib/nav";
import { projectStatus } from "@/lib/projects/status";

import { DecisionForm } from "./DecisionForm";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "review" };
export const dynamic = "force-dynamic";

const WHEN = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [row] = await getDb()
    .select({ project: projects, maker: users })
    .from(projects)
    .innerJoin(users, eq(projects.userSub, users.sub))
    .where(eq(projects.id, id))
    .limit(1);

  if (!row) notFound();
  const { project, maker } = row;
  const decided = Boolean(project.decision);

  return (
    <AppShell title={project.title} nav={ADMIN_NAV} home="/admin">
      <div className={styles.split}>
        <Panel>
          <PanelLabel>the submission</PanelLabel>
          {project.description ? <p className={styles.description}>{project.description}</p> : null}
          <div className={styles.facts}>
            <div className={styles.fact}>
              <span>maker</span>
              <span>
                {maker.name} · {maker.slackId}
              </span>
            </div>
            <div className={styles.fact}>
              <span>email</span>
              <span>{maker.email}</span>
            </div>
            <div className={styles.fact}>
              <span>hackatime</span>
              <span>{project.hackatimeProjects.join(", ") || "none"}</span>
            </div>
            <div className={styles.fact}>
              <span>sent</span>
              <span>{project.submittedAt ? WHEN.format(project.submittedAt) : "not sent"}</span>
            </div>
            <div className={styles.fact}>
              <span>status</span>
              <span>
                <ProjectStatusWord status={projectStatus(project)} size="s" />
              </span>
            </div>
          </div>
          <div className={styles.choices}>
            {project.repoUrl ? (
              <ButtonLink href={project.repoUrl} variant="quiet">
                repo
              </ButtonLink>
            ) : null}
            {project.demoUrl ? (
              <ButtonLink href={project.demoUrl} variant="quiet">
                demo
              </ButtonLink>
            ) : null}
          </div>
        </Panel>

        <Panel>
          <PanelLabel>{decided ? "decided" : "record a decision"}</PanelLabel>
          {decided ? (
            <Banner tone={project.decision === "approved" ? "ok" : "warn"}>
              {project.decision === "approved"
                ? `Approved for ${Math.floor((project.approvedMinutes ?? 0) / 60)} hours.`
                : `Recorded as ${project.decision}.`}
              {project.noteToMaker ? ` "${project.noteToMaker}"` : ""}
            </Banner>
          ) : !project.submittedAt ? (
            <Banner tone="warn">This is still a draft, so there is nothing to decide.</Banner>
          ) : (
            <DecisionForm id={project.id} trackedProjects={project.hackatimeProjects.length} />
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
