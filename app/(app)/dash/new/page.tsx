import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/users";
import { getPickerProjects } from "@/lib/hackatime/projects";

import { SubmitForm } from "./SubmitForm";

export const metadata: Metadata = { title: "send in a project" };
export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fdash%2Fnew");

  const projects = await getPickerProjects(user);

  return (
    <AppShell title="send in a project">
      {projects === null ? (
        <Banner tone="warn" title="hackatime is not connected">
          Without it you cannot pick your projects, and a name typed by hand that does not match
          counts as zero hours.
        </Banner>
      ) : null}
      {projects === null ? (
        <ButtonLink href="/dash/connect">connect Hackatime</ButtonLink>
      ) : (
        <SubmitForm projects={projects} />
      )}
    </AppShell>
  );
}
