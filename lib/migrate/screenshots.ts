import { eq, isNull, sql } from "drizzle-orm";

import { uploadToCdn } from "@/lib/cdn";
import { getDb } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";

import type { Plan, PlannedProject } from "./plan";

export type ScreenshotCounts = {
  uploaded: number;
  already: number;
  unmatched: number;
  noSource: number;
  failed: number;
};

export type ScreenshotFailure = { title: string; why: string };

export type ScreenshotResult = { counts: ScreenshotCounts; failures: ScreenshotFailure[] };

const CONCURRENCY = 4;
const MAX_MIGRATED_BYTES = 16 * 1024 * 1024;

function fileNameFor(url: string, type: string): string {
  const guess = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "screenshot";
  if (/\.[a-z0-9]{3,4}$/i.test(guess)) return guess;
  const extension = type.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
  return `${guess}.${extension}`;
}

async function download(url: string): Promise<File> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`source returned ${response.status}`);

  const type = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0) throw new Error("source was empty");

  return new File([bytes], fileNameFor(url, type), { type });
}

async function moveOne(
  project: PlannedProject,
  result: ScreenshotResult,
  onProgress: (line: string) => void,
): Promise<void> {
  const db = getDb();

  if (!project.screenshotUrl) {
    result.counts.noSource += 1;
    return;
  }

  const [row] = await db
    .select({ id: projects.id, thumbnailUrl: projects.thumbnailUrl })
    .from(projects)
    .innerJoin(users, eq(users.sub, projects.userSub))
    .where(sql`${users.slackId} = ${project.slackId} and ${projects.repoUrl} = ${project.repoUrl}`)
    .limit(1);

  if (!row) {
    result.counts.unmatched += 1;
    return;
  }

  if (row.thumbnailUrl) {
    result.counts.already += 1;
    return;
  }

  let file: File;
  try {
    file = await download(project.screenshotUrl);
  } catch (error) {
    result.counts.failed += 1;
    result.failures.push({
      title: project.title,
      why: error instanceof Error ? error.message : "download failed",
    });
    return;
  }

  const outcome = await uploadToCdn(file, MAX_MIGRATED_BYTES);

  if (outcome.status !== "uploaded") {
    result.counts.failed += 1;
    result.failures.push({ title: project.title, why: `${outcome.status} (${file.type})` });
    return;
  }

  const moved = await db
    .update(projects)
    .set({ thumbnailUrl: outcome.url })
    .where(sql`${projects.id} = ${row.id} and ${isNull(projects.thumbnailUrl)}`)
    .returning({ id: projects.id });

  if (moved.length === 0) {
    result.counts.already += 1;
    return;
  }

  result.counts.uploaded += 1;
  onProgress(`  ${project.title.slice(0, 40).padEnd(42)} ${outcome.url}`);
}

export async function importScreenshots(
  plan: Plan,
  onProgress: (line: string) => void = () => {},
): Promise<ScreenshotResult> {
  const result: ScreenshotResult = {
    counts: { uploaded: 0, already: 0, unmatched: 0, noSource: 0, failed: 0 },
    failures: [],
  };

  const queue = [...plan.projects];

  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (;;) {
      const project = queue.shift();
      if (!project) return;
      await moveOne(project, result, onProgress);
    }
  });

  await Promise.all(workers);

  return result;
}
