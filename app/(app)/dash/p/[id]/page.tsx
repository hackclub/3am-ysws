import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/Button";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { ProjectStatusWord } from "@/components/ui/StatusWord";
import { Timeline } from "@/components/ui/Timeline";
import type { TimelineStep } from "@/components/ui/Timeline";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import type { Project } from "@/lib/db/schema";
import { projectStatus } from "@/lib/projects/status";
import { getPickerProjects } from "@/lib/hackatime/projects";
import { BEANS_PER_HOUR } from "@/lib/rewards";

import { ResendForm } from "./ResendForm";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "project" };
export const dynamic = "force-dynamic";

const WHEN = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function steps(project: Project): TimelineStep[] {
  if (!project.submittedAt) {
    return [
      { title: "started", meta: WHEN.format(project.createdAt), state: "done" },
      { title: "not sent yet", meta: "finish it and send it in", state: "pending" },
    ];
  }

  const decided = Boolean(project.decision);
  const tone =
    project.decision === "approved"
      ? "ok"
      : project.decision === "changes"
        ? "warn"
        : project.decision === "rejected"
          ? "bad"
          : undefined;

  return [
    { title: "sent in", meta: WHEN.format(project.submittedAt), state: "done" },
    {
      title: "with the reviewers",
      meta: decided ? "done" : "we will message you on Slack",
      state: decided ? "done" : "now",
    },
    {
      title: decided ? "decided" : "decision",
      meta: project.decidedAt ? WHEN.format(project.decidedAt) : "not yet",
      state: decided ? "done" : "pending",
      tone,
    },
  ];
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fdash%2Fprojects");

  const { id } = await params;
  const [project] = await getDb()
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userSub, user.sub)))
    .limit(1);

  if (!project) notFound();

  const status = projectStatus(project);
  const hours = Math.floor((project.approvedMinutes ?? 0) / 60);
  const resendable =
    project.decision === "changes" ||
    project.decision === "rejected" ||
    project.decision === "withdrawn";
  const options = resendable ? ((await getPickerProjects(user)) ?? []) : [];

  return (
    <AppShell title={project.title}>
      {project.decision === "changes" ? (
        <Banner tone="warn" title="the reviewer asked for changes">
          {project.noteToMaker ?? "Have another look and send it back."}
        </Banner>
      ) : null}
      {project.decision === "rejected" ? (
        <Banner tone="bad" title="not approved">
          {project.noteToMaker ?? "You can fix it and send it back."}
        </Banner>
      ) : null}
      <div className={styles.split}>
        <Panel>
          <div className={styles.thumb}>
            {project.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={project.thumbnailUrl} alt="" />
            ) : (
              "no screenshot"
            )}
          </div>
          {project.description ? <p className={styles.description}>{project.description}</p> : null}
          <div className={styles.links}>
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
          <PanelLabel>where it is</PanelLabel>
          <Timeline steps={steps(project)} />
        </Panel>

        <div className={styles.side}>
          <Panel>
            <PanelLabel>status</PanelLabel>
            <ProjectStatusWord status={status} size="l" />
            {project.noteToMaker ? <p className={styles.note}>{project.noteToMaker}</p> : null}
            <div className={styles.facts}>
              <div className={styles.fact}>
                <span>hackatime projects</span>
                <span className="tabular">{project.hackatimeProjects.length}</span>
              </div>
              {project.decision === "approved" ? (
                <>
                  <div className={styles.fact}>
                    <span>approved</span>
                    <span className="tabular">{hours}h</span>
                  </div>
                  <div className={styles.fact}>
                    <span>beans</span>
                    <span className="tabular">{hours * BEANS_PER_HOUR}</span>
                  </div>
                </>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>

      {resendable ? (
        <ResendForm
          project={{
            id: project.id,
            title: project.title,
            description: project.description ?? "",
            repoUrl: project.repoUrl ?? "",
            demoUrl: project.demoUrl ?? "",
            thumbnailUrl: project.thumbnailUrl ?? "",
            hackatimeProjects: project.hackatimeProjects,
          }}
          options={options}
        />
      ) : null}
    </AppShell>
  );
}
