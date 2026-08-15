import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/Button";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { StatusWord } from "@/components/ui/StatusWord";
import { getCurrentUser } from "@/lib/auth/users";
import { getPickerProjects } from "@/lib/hackatime/projects";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "hackatime" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { tone: "ok" | "warn" | "bad"; text: string }> = {
  connected: {
    tone: "ok",
    text: "Hackatime is connected. Your projects will show up when you ship.",
  },
  denied: { tone: "warn", text: "You said no on Hackatime's screen, so nothing was connected." },
  failed: {
    tone: "bad",
    text: "That did not work. Try again, and tell us in #3am if it keeps failing.",
  },
};

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fdash%2Fconnect");

  const { status } = await searchParams;
  const banner = status ? STATUS[status] : undefined;
  const projects = await getPickerProjects(user);
  const connected = projects !== null;

  return (
    <AppShell
      title="hackatime"
      aside={
        <>
          <Image
            src="/assets/owl.png"
            alt=""
            width={44}
            height={44}
            className="pixel"
            unoptimized
          />
          <p>keep building!</p>
        </>
      }
    >
      {banner ? <Banner tone={banner.tone}>{banner.text}</Banner> : null}

      <Panel>
        <PanelLabel>why we need this</PanelLabel>
        <p className={styles.copy}>
          Hackatime is how we know how long you spent. Connecting it means you pick your projects
          from a list when you ship, instead of typing their names and hoping. A name that does not
          match exactly counts as zero hours.
        </p>
        {connected ? (
          <div className={styles.actions}>
            <StatusWord tone="ok">connected</StatusWord>
            <ButtonLink href="/api/hackatime/connect" variant="quiet">
              reconnect
            </ButtonLink>
          </div>
        ) : (
          <div className={styles.actions}>
            <ButtonLink href="/api/hackatime/connect">connect Hackatime</ButtonLink>
          </div>
        )}
      </Panel>

      {connected ? (
        <Panel>
          <PanelLabel>what we can see</PanelLabel>
          {projects.length === 0 ? (
            <p className={styles.copy}>
              Nothing tracked yet. Install the Hackatime plugin in your editor and it will fill up
              on its own.
            </p>
          ) : (
            <div className={styles.list}>
              {projects.map((project) => (
                <span key={project.key} className={styles.chip}>
                  {project.key}
                  <span>{project.hours}</span>
                </span>
              ))}
            </div>
          )}
        </Panel>
      ) : null}
    </AppShell>
  );
}
