import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { AppShell } from "@/components/app/AppShell";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { getPickerProjects } from "@/lib/hackatime/projects";

import { SubmitForm } from "../../../new/SubmitForm";

export const metadata: Metadata = { title: "edit draft" };
export const dynamic = "force-dynamic";

export default async function EditDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fdash%2Fprojects");

  const { id } = await params;
  const [project] = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (!project || project.userSub !== user.sub) notFound();
  if (project.submittedAt || project.decision) redirect(`/dash/p/${project.id}`);

  const options = (await getPickerProjects(user)) ?? [];

  return (
    <AppShell title="edit draft">
      <SubmitForm
        projects={options}
        initial={{
          id: project.id,
          title: project.title,
          description: project.description ?? "",
          repoUrl: project.repoUrl ?? "",
          demoUrl: project.demoUrl ?? "",
          thumbnailUrl: project.thumbnailUrl ?? "",
          hackatimeProjects: project.hackatimeProjects,
        }}
      />
    </AppShell>
  );
}
