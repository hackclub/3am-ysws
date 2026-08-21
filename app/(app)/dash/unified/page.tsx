import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { requireOrganizer } from "@/lib/auth/organizer";
import { readApproved } from "@/lib/ysws/submissions";
import { yswsIsConfigured } from "@/lib/ysws/config";
import { Banner } from "@/components/ui/Banner";

import { Rows } from "./Rows";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "unified" };
export const dynamic = "force-dynamic";

export default async function UnifiedPage() {
  if (!(await requireOrganizer())) notFound();

  const rows = await readApproved();
  const waiting = rows.filter((row) => row.state !== "sent").length;

  return (
    <AppShell title="unified">
      {yswsIsConfigured() ? null : (
        <Banner tone="warn" title="the bridge is not set up here">
          YSWS_PROGRAM_ID and YSWS_BRIDGE_SECRET are not both set, so a preview works but sending
          will not.
        </Banner>
      )}

      <Panel>
        <PanelLabel>
          {rows.length === 1 ? "1 approved project" : `${rows.length} approved projects`}
          {waiting > 0 ? ` · ${waiting} not sent` : " · all sent"}
        </PanelLabel>
        {rows.length === 0 ? (
          <p className={styles.none}>Nothing approved yet.</p>
        ) : (
          <Rows rows={rows} />
        )}
      </Panel>
    </AppShell>
  );
}
