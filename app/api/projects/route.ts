import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { validateSubmission } from "@/lib/ari/payload";
import { repoHasReadme, repoIsReachable } from "@/lib/ari/repo";
import { canShip, checkEligibility } from "@/lib/auth/eligibility";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { getReviewBackend, reviewIsExternal } from "@/lib/review";
import type { ReviewSubmission } from "@/lib/review";

export const dynamic = "force-dynamic";

type Body = {
  id?: string;
  title?: string;
  description?: string;
  repoUrl?: string;
  demoUrl?: string;
  thumbnailUrl?: string;
  hackatimeProjects?: string[];
  updateMessage?: string;
};

function isUniqueViolation(error: unknown): boolean {
  const candidates = [error, (error as { cause?: unknown })?.cause];
  return candidates.some((value) => (value as { code?: string })?.code === "23505");
}

function invalid(field: string, message: string) {
  return NextResponse.json({ error: "invalid", field, message }, { status: 422 });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  if (reviewIsExternal() && !canShip(await checkEligibility({ slackId: user.slackId }))) {
    return NextResponse.json({ error: "not_eligible" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return invalid("body", "That request was not readable.");
  }

  const title = body.title?.trim() ?? "";
  if (!title) return invalid("title", "Give it a name.");

  const candidate: ReviewSubmission = {
    externalId: "pending",
    title,
    description: body.description?.trim() ?? "",
    repoUrl: body.repoUrl?.trim() ?? "",
    demoUrl: body.demoUrl?.trim() ?? "",
    thumbnailUrl: body.thumbnailUrl?.trim() ?? "",
    hackatimeProjects: body.hackatimeProjects ?? [],
    maker: { email: user.email, name: user.name, slackId: user.slackId },
    updateMessage: body.updateMessage,
  };

  const problem = validateSubmission(candidate);
  if (problem) return invalid(problem.field, problem.message);

  const reachable = await repoIsReachable(candidate.repoUrl);
  if (reachable === false) {
    return invalid(
      "repo_url",
      "We cannot see that repository. Is it public, and is the link right?",
    );
  }

  if ((await repoHasReadme(candidate.repoUrl)) === false) {
    return invalid(
      "repo_url",
      "That repository needs a README saying what the project is and how to run it.",
    );
  }

  const db = getDb();
  const values = {
    title,
    description: body.description?.trim() ?? null,
    repoUrl: body.repoUrl?.trim() ?? null,
    demoUrl: body.demoUrl?.trim() ?? null,
    thumbnailUrl: body.thumbnailUrl?.trim() ?? null,
    hackatimeProjects: body.hackatimeProjects ?? [],
  };

  let row;
  try {
    if (body.id) {
      const existing = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, body.id), eq(projects.userSub, user.sub)))
        .limit(1);
      if (existing.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
      if (existing[0].submittedAt && !existing[0].decision) {
        return NextResponse.json({ error: "already_queued" }, { status: 409 });
      }
      [row] = await db.update(projects).set(values).where(eq(projects.id, body.id)).returning();
    } else {
      [row] = await db
        .insert(projects)
        .values({ ...values, userSub: user.sub })
        .returning();
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "duplicate_repo", message: "You already have a project on that repository." },
        { status: 409 },
      );
    }
    throw error;
  }

  const outcome = await getReviewBackend().submit({ ...candidate, externalId: row.id });

  if (outcome.status === "rejected") return invalid(outcome.field ?? "body", outcome.message);
  if (outcome.status === "already_queued") {
    return NextResponse.json({ error: "already_queued" }, { status: 409 });
  }
  if (outcome.status === "unavailable") {
    return NextResponse.json({ error: "unavailable", message: outcome.message }, { status: 503 });
  }

  await db
    .update(projects)
    .set({ submittedAt: new Date(), decision: null, noteToMaker: null, decidedAt: null })
    .where(and(eq(projects.id, row.id), isNull(projects.decidedAt)));

  return NextResponse.json({ ok: true, id: row.id, status: "queued" });
}
