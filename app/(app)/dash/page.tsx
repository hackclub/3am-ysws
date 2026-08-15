import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { RowLink, RowText } from "@/components/ui/Row";
import { ProjectStatusWord } from "@/components/ui/StatusWord";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { projectStatus } from "@/lib/projects/status";

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

  return (
    <AppShell title="tonight" action={<ButtonLink href="/dash/new">send in a project</ButtonLink>}>
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
