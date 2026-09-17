import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/users";
import { getPickerProjects } from "@/lib/hackatime/projects";
import { getYswsConfig, submissionsAreOpen } from "@/lib/yswsConfig";

import { SubmitForm } from "./SubmitForm";

export const metadata: Metadata = { title: "send in a project" };
export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fdash%2Fnew");

  const config = await getYswsConfig();
  const open = submissionsAreOpen(config);
  const projects = open ? await getPickerProjects(user) : [];

  return (
    <AppShell title="send in a project">
      {!open ? (
        <Banner tone="warn" title="submissions are closed">
          The 3am YSWS is no longer accepting new projects right now.
        </Banner>
      ) : projects === null ? (
        <Banner tone="warn" title="hackatime is not connected">
          Without it you cannot pick your projects, and a name typed by hand that does not match
          counts as zero hours.
        </Banner>
      ) : null}
      {!open ? (
        <ButtonLink href="/dash">back to dashboard</ButtonLink>
      ) : projects === null ? (
        <ButtonLink href="/dash/connect">connect Hackatime</ButtonLink>
      ) : (
        <SubmitForm projects={projects} />
      )}
    </AppShell>
  );
}
