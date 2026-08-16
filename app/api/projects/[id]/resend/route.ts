import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { validateSubmission } from "@/lib/ari/payload";
import { repoIsReachable } from "@/lib/ari/repo";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { getReviewBackend } from "@/lib/review";
import type { ReviewSubmission } from "@/lib/review";

export const dynamic = "force-dynamic";

const RESENDABLE = ["changes", "rejected", "withdrawn"] as const;

type Body = {
  title?: string;
  description?: string;
  repoUrl?: string;
  demoUrl?: string;
  thumbnailUrl?: string;
  hackatimeProjects?: string[];
  updateMessage?: string;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userSub, user.sub)))
    .limit(1);

  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!project.decision) return NextResponse.json({ error: "still_open" }, { status: 409 });
  if (!RESENDABLE.includes(project.decision as (typeof RESENDABLE)[number])) {
    return NextResponse.json({ error: "already_approved" }, { status: 409 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const values = {
    title: body.title?.trim() || project.title,
    description: body.description?.trim() ?? project.description,
    repoUrl: body.repoUrl?.trim() ?? project.repoUrl,
    demoUrl: body.demoUrl?.trim() ?? project.demoUrl,
    thumbnailUrl: body.thumbnailUrl?.trim() ?? project.thumbnailUrl,
    hackatimeProjects: body.hackatimeProjects ?? project.hackatimeProjects,
  };

  const submission: ReviewSubmission = {
    externalId: project.id,
    title: values.title,
    description: values.description ?? "",
    repoUrl: values.repoUrl ?? "",
    demoUrl: values.demoUrl ?? "",
    thumbnailUrl: values.thumbnailUrl ?? "",
    hackatimeProjects: values.hackatimeProjects,
    maker: { email: user.email, name: user.name, slackId: user.slackId },
    isUpdate: true,
    updateMessage: body.updateMessage,
  };

  const problem = validateSubmission(submission);
  if (problem) {
    return NextResponse.json(
      { error: "invalid", field: problem.field, message: problem.message },
      { status: 422 },
    );
  }

  if ((await repoIsReachable(submission.repoUrl)) === false) {
    return NextResponse.json(
      {
        error: "invalid",
        field: "repo_url",
        message: "We cannot see that repository. Is it public, and is the link right?",
      },
      { status: 422 },
    );
  }

  const outcome = await getReviewBackend().submit(submission);

  if (outcome.status === "rejected") {
    return NextResponse.json(
      { error: "invalid", field: outcome.field, message: outcome.message },
      { status: 422 },
    );
  }
  if (outcome.status === "already_queued") {
    return NextResponse.json({ error: "already_queued" }, { status: 409 });
  }
  if (outcome.status === "unavailable") {
    return NextResponse.json({ error: "unavailable", message: outcome.message }, { status: 503 });
  }

  await db
    .update(projects)
    .set({
      ...values,
      submittedAt: new Date(),
      decision: null,
      noteToMaker: null,
      approvedMinutes: null,
      decidedAt: null,
    })
    .where(eq(projects.id, project.id));

  return NextResponse.json({ ok: true, id: project.id, status: "queued" });
}
