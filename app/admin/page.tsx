import type { Metadata } from "next";

import { AppShell } from "@/components/app/AppShell";
import { Banner } from "@/components/ui/Banner";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { StatusWord } from "@/components/ui/StatusWord";
import { ADMIN_NAV } from "@/lib/nav";
import { getReviewBackend, reviewConfigProblems } from "@/lib/review";

export const metadata: Metadata = { title: "organizer" };

export const dynamic = "force-dynamic";

export default function AdminHome() {
  const backend = getReviewBackend().name;
  const problems = reviewConfigProblems();

  return (
    <AppShell title="organizer" nav={ADMIN_NAV} home="/admin">
      {problems.map((problem) => (
        <Banner key={problem} tone="bad" title="review is misconfigured">
          {problem}
        </Banner>
      ))}
      <Panel>
        <PanelLabel>where reviews go</PanelLabel>
        <StatusWord tone={backend === "ari" ? "ok" : "muted"}>
          {backend === "ari" ? "ari, the real queue" : "local, nothing leaves this server"}
        </StatusWord>
        <p style={{ fontSize: "15px", color: "var(--soft)" }}>
          {backend === "ari"
            ? "Submissions are sent to reviewers and decisions come back by webhook."
            : "Set ARI_PROGRAM_ID and ARI_INGEST_SECRET to send submissions to real reviewers. Until then decisions are recorded here by organizers."}
        </p>
      </Panel>
    </AppShell>
  );
}
