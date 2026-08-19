import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";
import { getReviewBackend, type ReviewSubmission } from "@/lib/review";
import { validateSubmission } from "@/lib/ari/payload";

export type QueuedRow = {
  submission: ReviewSubmission;
  submittedAt: Date | null;
  problem: { field: string; message: string } | null;
};

export type SendCounts = {
  sent: number;
  already: number;
  invalid: number;
  refused: number;
  unavailable: number;
};

export type SendNote = { title: string; why: string };

export type SendResult = { counts: SendCounts; skipped: SendNote[]; failed: SendNote[] };

export async function readQueued(): Promise<QueuedRow[]> {
  const rows = await getDb()
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      repoUrl: projects.repoUrl,
      demoUrl: projects.demoUrl,
      thumbnailUrl: projects.thumbnailUrl,
      hackatimeProjects: projects.hackatimeProjects,
      submittedAt: projects.submittedAt,
      email: users.email,
      name: users.name,
      slackId: users.slackId,
    })
    .from(projects)
    .innerJoin(users, eq(users.sub, projects.userSub))
    .where(and(isNull(projects.decision), isNotNull(projects.submittedAt)))
    .orderBy(asc(projects.submittedAt));

  return rows.map((row) => {
    const submission: ReviewSubmission = {
      externalId: row.id,
      title: row.title,
      description: row.description ?? "",
      repoUrl: row.repoUrl ?? "",
      demoUrl: row.demoUrl ?? "",
      thumbnailUrl: row.thumbnailUrl ?? "",
      hackatimeProjects: row.hackatimeProjects,
      maker: { email: row.email, name: row.name, slackId: row.slackId },
    };

    return { submission, submittedAt: row.submittedAt, problem: validateSubmission(submission) };
  });
}

export async function sendQueued(
  rows: QueuedRow[],
  onProgress: (line: string) => void = () => {},
): Promise<SendResult> {
  const backend = getReviewBackend();
  const result: SendResult = {
    counts: { sent: 0, already: 0, invalid: 0, refused: 0, unavailable: 0 },
    skipped: [],
    failed: [],
  };

  for (const row of rows) {
    const { submission, problem } = row;

    if (problem) {
      result.counts.invalid += 1;
      result.skipped.push({ title: submission.title, why: `${problem.field}: ${problem.message}` });
      continue;
    }

    const outcome = await backend.submit(submission);

    if (outcome.status === "queued") {
      result.counts.sent += 1;
      onProgress(`  sent      ${submission.title.slice(0, 44)}`);
      continue;
    }

    if (outcome.status === "already_queued") {
      result.counts.already += 1;
      onProgress(`  already   ${submission.title.slice(0, 44)}`);
      continue;
    }

    if (outcome.status === "rejected") {
      result.counts.refused += 1;
      result.failed.push({
        title: submission.title,
        why: `ari refused, ${outcome.field ?? "unknown"}: ${outcome.message}`,
      });
      continue;
    }

    result.counts.unavailable += 1;
    result.failed.push({ title: submission.title, why: outcome.message });
  }

  return result;
}
