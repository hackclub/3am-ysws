import type { Metadata } from "next";

import { AppShell } from "@/components/app/AppShell";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { ADMIN_NAV } from "@/lib/nav";

export const metadata: Metadata = { title: "organizer" };

export default function AdminHome() {
  return (
    <AppShell title="organizer" nav={ADMIN_NAV} home="/admin">
      <Panel>
        <PanelLabel>overview</PanelLabel>
        <p style={{ fontSize: "15px", color: "var(--soft)" }}>
          Submissions and decisions land here next.
        </p>
      </Panel>
    </AppShell>
  );
}
