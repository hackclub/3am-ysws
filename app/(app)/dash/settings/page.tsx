import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { StatusWord } from "@/components/ui/StatusWord";
import { readAddress } from "@/lib/address";
import { hcaIssuer } from "@/lib/auth/hca";
import { getCurrentUser } from "@/lib/auth/users";
import { readGrant } from "@/lib/grant";
import { getPickerProjects } from "@/lib/hackatime/projects";

import { AddressForm } from "./AddressForm";
import { GrantForm } from "./GrantForm";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fdash%2Fsettings");

  const projects = await getPickerProjects(user);
  const connected = projects !== null;
  const saved = readAddress(user);
  const grant = readGrant(user);

  return (
    <AppShell title="settings">
      <Panel className={styles.panel}>
        <PanelLabel>who you are</PanelLabel>
        <div className={styles.row}>
          <div className={styles.readonly}>
            <span className={styles.label}>name</span>
            <span className={styles.value}>{user.name}</span>
          </div>
          <div className={styles.readonly}>
            <span className={styles.label}>email</span>
            <span className={styles.value}>{user.email}</span>
          </div>
        </div>
        <p className={styles.help}>
          This comes from your Hack Club account. Change it there and it changes here.
        </p>
        <div className={styles.actions}>
          <ButtonLink href={hcaIssuer()} variant="quiet">
            open Hack Club account
          </ButtonLink>
        </div>
      </Panel>

      <Panel className={styles.panel}>
        <PanelLabel>hackatime</PanelLabel>
        <div className={styles.line}>
          <StatusWord tone={connected ? "ok" : "muted"}>
            {connected ? "connected" : "not connected"}
          </StatusWord>
          <ButtonLink href="/api/hackatime/connect" variant="quiet">
            {connected ? "reconnect" : "connect"}
          </ButtonLink>
        </div>
        <p className={styles.help}>
          {connected
            ? `We can see ${projects.length} ${projects.length === 1 ? "project" : "projects"}. This is how your hours are counted.`
            : "Without it you cannot pick your projects when you ship, and typed names that do not match count as zero hours."}
        </p>
      </Panel>

      <Panel className={styles.panel}>
        <PanelLabel>where grants go</PanelLabel>
        <p className={styles.help}>
          Fill this in once and checkout is one click. Only organizers packing your grant can see
          it.
        </p>
        <AddressForm address={{ ...saved, fullName: saved.fullName || user.name }} />
      </Panel>

      <Panel className={styles.panel}>
        <PanelLabel>for the paperwork</PanelLabel>
        <p className={styles.help}>
          Hack Club needs these on file before a grant can be sent out. Nobody else sees them.
        </p>
        <GrantForm details={grant} />
      </Panel>

      <Panel className={styles.panel}>
        <PanelLabel>this device</PanelLabel>
        <SignOutButton />
      </Panel>
    </AppShell>
  );
}
