import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { RowLink, RowText } from "@/components/ui/Row";
import { ProjectStatusWord } from "@/components/ui/StatusWord";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { projectStatus } from "@/lib/projects/status";
import type { ProjectStatus } from "@/lib/status";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "your projects" };
export const dynamic = "force-dynamic";

const WHEN = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

const FILTERS: { key: string; label: string; matches: (status: ProjectStatus) => boolean }[] = [
  { key: "all", label: "all", matches: () => true },
  { key: "open", label: "with us", matches: (status) => status === "queued" },
  { key: "approved", label: "approved", matches: (status) => status === "approved" },
  { key: "changes", label: "needs changes", matches: (status) => status === "changes" },
  { key: "drafts", label: "drafts", matches: (status) => status === "draft" },
];

const NOTHING: Record<string, string> = {
  all: "Nothing yet. Send in your first project.",
  open: "Nothing is with the reviewers right now.",
  approved: "Nothing approved yet.",
  changes: "Nothing needs changing. Good sign.",
  drafts: "No drafts sitting around.",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fdash%2Fprojects");

  const { filter } = await searchParams;
  const active = FILTERS.find((option) => option.key === filter) ?? FILTERS[0];

  const mine = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.userSub, user.sub))
    .orderBy(desc(projects.createdAt));

  const shown = mine.filter((project) => active.matches(projectStatus(project)));

  return (
    <AppShell
      title="your projects"
      action={<ButtonLink href="/dash/new">send in a project</ButtonLink>}
    >
      <nav className={styles.filters} aria-label="filter projects">
        {FILTERS.map((option) => (
          <Link
            key={option.key}
            href={option.key === "all" ? "/dash/projects" : `/dash/projects?filter=${option.key}`}
            className={[styles.filter, option.key === active.key ? styles.on : null]
              .filter(Boolean)
              .join(" ")}
            aria-current={option.key === active.key ? "page" : undefined}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      <Panel>
        {shown.length === 0 ? (
          <p className={styles.none}>{NOTHING[active.key]}</p>
        ) : (
          <div className={styles.list}>
            {shown.map((project) => (
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
        )}
      </Panel>
    </AppShell>
  );
}
