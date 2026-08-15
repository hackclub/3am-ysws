import { desc, eq, isNotNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/app/AppShell";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { ProjectStatusWord } from "@/components/ui/StatusWord";
import { getDb } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";
import { ADMIN_NAV } from "@/lib/nav";
import { projectStatus } from "@/lib/projects/status";
import type { ProjectStatus } from "@/lib/status";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "submissions" };
export const dynamic = "force-dynamic";

const WHEN = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

const FILTERS: { key: string; label: string; matches: (status: ProjectStatus) => boolean }[] = [
  { key: "open", label: "waiting", matches: (status) => status === "queued" },
  { key: "all", label: "everything", matches: () => true },
  { key: "approved", label: "approved", matches: (status) => status === "approved" },
  { key: "changes", label: "changes asked", matches: (status) => status === "changes" },
  { key: "rejected", label: "not approved", matches: (status) => status === "rejected" },
];

export default async function ShipsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const active = FILTERS.find((option) => option.key === filter) ?? FILTERS[0];

  const rows = await getDb()
    .select({ project: projects, maker: users })
    .from(projects)
    .innerJoin(users, eq(projects.userSub, users.sub))
    .where(isNotNull(projects.submittedAt))
    .orderBy(desc(projects.submittedAt));

  const shown = rows.filter((row) => active.matches(projectStatus(row.project)));

  return (
    <AppShell title="submissions" nav={ADMIN_NAV} home="/admin">
      <nav className={styles.filters} aria-label="filter submissions">
        {FILTERS.map((option) => (
          <Link
            key={option.key}
            href={`/admin/ships?filter=${option.key}`}
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
        <PanelLabel>
          {shown.length === 1 ? "1 submission" : `${shown.length} submissions`}
        </PanelLabel>
        {shown.length === 0 ? (
          <p className={styles.none}>Nothing here.</p>
        ) : (
          <div className={styles.wrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>maker</th>
                  <th>project</th>
                  <th>sent</th>
                  <th>hours</th>
                  <th>status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ project, maker }) => (
                  <tr key={project.id}>
                    <td>
                      <span className={styles.maker}>{maker.name}</span>
                      <span className={styles.sub}>{maker.slackId}</span>
                    </td>
                    <td>
                      <Link href={`/admin/ships/${project.id}`}>{project.title}</Link>
                      <span className={styles.sub}>
                        {project.hackatimeProjects.join(", ") || "no hackatime projects"}
                      </span>
                    </td>
                    <td>{project.submittedAt ? WHEN.format(project.submittedAt) : ""}</td>
                    <td>
                      {project.approvedMinutes == null
                        ? "—"
                        : `${Math.floor(project.approvedMinutes / 60)}h`}
                    </td>
                    <td>
                      <ProjectStatusWord status={projectStatus(project)} size="s" />
                    </td>
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
