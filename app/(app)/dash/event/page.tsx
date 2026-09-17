import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { requireOrganizer } from "@/lib/auth/organizer";
import { getDb } from "@/lib/db";
import { yswsConfig } from "@/lib/db/schema";
import { getYswsConfig } from "@/lib/yswsConfig";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "event controls" };
export const dynamic = "force-dynamic";

function inputValue(date: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 16);
}

export default async function EventControlsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!(await requireOrganizer())) notFound();

  const config = await getYswsConfig();
  const { saved } = await searchParams;

  async function save(formData: FormData) {
    "use server";

    if (!(await requireOrganizer())) notFound();

    const rawDeadline = String(formData.get("deadline") ?? "").trim();
    let deadline: Date | null = null;
    if (rawDeadline) {
      const parsed = new Date(`${rawDeadline}:00Z`);
      if (Number.isNaN(parsed.getTime())) return;
      deadline = parsed;
    }

    const submissionsOpen = formData.get("submissionsOpen") === "on";
    const resubmissionsOpen = submissionsOpen && formData.get("resubmissionsOpen") === "on";
    const now = new Date();

    await getDb()
      .insert(yswsConfig)
      .values({
        id: 1,
        submissionDeadline: deadline,
        submissionsOpen,
        resubmissionsOpen,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: yswsConfig.id,
        set: {
          submissionDeadline: deadline,
          submissionsOpen,
          resubmissionsOpen,
          updatedAt: now,
        },
      });

    redirect("/dash/event?saved=1");
  }

  return (
    <AppShell title="event controls">
      {saved === "1" ? <p className={styles.saved}>saved. the public site is using these controls now.</p> : null}

      <form action={save}>
        <Panel className={styles.panel}>
          <PanelLabel>submission deadline</PanelLabel>
          <label className={styles.field}>
            <span className={styles.label}>last date and time (UTC)</span>
            <input
              className={styles.input}
              type="datetime-local"
              name="deadline"
              defaultValue={inputValue(config.submissionDeadline)}
            />
          </label>
          <p className={styles.help}>
            When this time passes, new submissions and resubmissions are blocked automatically and the homepage switches to the completed state.
          </p>
        </Panel>

        <Panel className={styles.panel}>
          <PanelLabel>submissions</PanelLabel>
          <label className={styles.toggle}>
            <input type="checkbox" name="submissionsOpen" defaultChecked={config.submissionsOpen} />
            <span>
              <strong>allow new submissions</strong>
              <small>Turn this off to stop both new submissions and resubmissions.</small>
            </span>
          </label>
        </Panel>

        <Panel className={styles.panel}>
          <PanelLabel>resubmissions</PanelLabel>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              name="resubmissionsOpen"
              defaultChecked={config.resubmissionsOpen}
              disabled={!config.submissionsOpen}
            />
            <span>
              <strong>allow resubmissions</strong>
              <small>Controls projects that were asked to make changes, rejected, or withdrawn.</small>
            </span>
          </label>
        </Panel>

        <div className={styles.actions}>
          <button className={styles.save} type="submit">save event controls</button>
        </div>
      </form>
    </AppShell>
  );
}
