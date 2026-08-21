import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";

import { repoCommitCount } from "@/lib/ari/repo";
import { getDb } from "@/lib/db";
import { projects, users, yswsSubmissions } from "@/lib/db/schema";
import { missingForGrant } from "@/lib/grant";

import { buildPayload, send } from "./client";
import type { ApprovedRow, GateProblem, PendingRow } from "./types";
import { validate } from "./validate";

export type SendReport =
  | { status: "sent"; recordId: string | null }
  | { status: "held"; field: string; message: string }
  | { status: "refused"; message: string }
  | { status: "unavailable"; message: string }
  | { status: "not_found" }
  | { status: "not_approved" }
  | { status: "already_sent" };

export type Preview =
  | { status: "ready" | "blocked"; payload: Record<string, unknown>; problem: GateProblem | null }
  | { status: "not_found" }
  | { status: "not_approved" };

export async function previewUnified(projectId: string): Promise<Preview> {
  const row = await readOne(projectId);
  if (!row) {
    const [project] = await getDb()
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    return project ? { status: "not_approved" } : { status: "not_found" };
  }

  const problem = validate(row);
  return {
    status: problem ? "blocked" : "ready",
    payload: buildPayload(row, process.env.YSWS_PROGRAM_ID ?? "(YSWS_PROGRAM_ID is not set)"),
    problem,
  };
}

export async function readApproved(): Promise<ApprovedRow[]> {
  const rows = await getDb()
    .select({ project: projects, maker: users, submission: yswsSubmissions })
    .from(projects)
    .innerJoin(users, eq(users.sub, projects.userSub))
    .leftJoin(yswsSubmissions, eq(yswsSubmissions.projectId, projects.id))
    .where(eq(projects.decision, "approved"))
    .orderBy(desc(projects.decidedAt));

  return rows.map(({ project, maker, submission }) => ({
    projectId: project.id,
    title: project.title,
    maker: maker.name,
    email: maker.email,
    decidedAt: project.decidedAt,
    approvedMinutes: project.approvedMinutes,
    overrideMinutes: submission?.overrideMinutes ?? null,
    state: submission?.state ?? null,
    recordId: submission?.recordId ?? null,
    error: submission?.error ?? null,
    ageJustification: submission?.ageJustification ?? null,
    duplicateJustification: submission?.duplicateJustification ?? null,
    missing: missingForGrant(maker),
  }));
}

async function readOne(projectId: string): Promise<PendingRow | null> {
  const db = getDb();

  const [row] = await db
    .select({ project: projects, maker: users, submission: yswsSubmissions })
    .from(projects)
    .innerJoin(users, eq(users.sub, projects.userSub))
    .leftJoin(yswsSubmissions, eq(yswsSubmissions.projectId, projects.id))
    .where(and(eq(projects.id, projectId), eq(projects.decision, "approved")))
    .limit(1);

  if (!row) return null;
  const { project, maker, submission } = row;

  const shared = project.repoUrl
    ? await db
        .selectDistinct({ userSub: projects.userSub })
        .from(projects)
        .where(and(isNotNull(projects.repoUrl), inArray(projects.repoUrl, [project.repoUrl])))
    : [];

  return {
    projectId: project.id,
    title: project.title,
    description: project.description,
    repoUrl: project.repoUrl,
    demoUrl: project.demoUrl,
    thumbnailUrl: project.thumbnailUrl,
    hackatimeProjects: project.hackatimeProjects,
    approvedMinutes: project.approvedMinutes,
    noteToMaker: project.noteToMaker,
    decidedAt: project.decidedAt,

    email: maker.email,
    hackatimeId: maker.hackatimeId,
    firstName: maker.firstName,
    lastName: maker.lastName,
    birthday: maker.birthday,
    addressLine1: maker.addressLine1,
    addressLine2: maker.addressLine2,
    city: maker.city,
    stateProvince: maker.stateProvince,
    postcode: maker.postcode,
    country: maker.country,

    recordId: submission?.recordId ?? null,
    firstSubmittedAt: submission?.firstSubmittedAt ?? null,
    overrideMinutes: submission?.overrideMinutes ?? null,
    hoursJustification: submission?.hoursJustification ?? null,
    ageJustification: submission?.ageJustification ?? null,
    duplicateJustification: submission?.duplicateJustification ?? null,

    commits: project.repoUrl ? await repoCommitCount(project.repoUrl) : null,
    sharedCodeUrl: shared.length > 1,
  };
}

async function record(projectId: string, values: Record<string, unknown>): Promise<void> {
  const db = getDb();
  await db
    .insert(yswsSubmissions)
    .values({ projectId, ...values })
    .onConflictDoUpdate({ target: yswsSubmissions.projectId, set: values });
}

export async function sendToUnified(projectId: string): Promise<SendReport> {
  const db = getDb();

  const [existing] = await db
    .select({ state: yswsSubmissions.state })
    .from(yswsSubmissions)
    .where(eq(yswsSubmissions.projectId, projectId))
    .limit(1);

  if (existing?.state === "sent") return { status: "already_sent" };

  const row = await readOne(projectId);
  if (!row) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    return project ? { status: "not_approved" } : { status: "not_found" };
  }

  const problem = validate(row);
  if (problem) {
    await record(projectId, {
      state: "held",
      error: `${problem.field}: ${problem.message}`,
    });
    return { status: "held", field: problem.field, message: problem.message };
  }

  const outcome = await send(row);
  const lastAttemptAt = new Date();

  if (outcome.status === "sent") {
    await record(projectId, {
      state: "sent",
      error: null,
      recordId: outcome.recordId ?? row.recordId,
      firstSubmittedAt: row.firstSubmittedAt ?? lastAttemptAt,
      lastAttemptAt,
    });
    return { status: "sent", recordId: outcome.recordId ?? row.recordId };
  }

  await record(projectId, {
    state: outcome.status === "refused" ? "error" : "queued",
    error: outcome.message,
    lastAttemptAt,
  });

  return outcome;
}
