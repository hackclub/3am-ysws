import { eq } from "drizzle-orm";

import { githubSlug } from "@/lib/ari/repo";
import { getDb } from "@/lib/db";
import { projects, users, yswsSubmissions } from "@/lib/db/schema";
import type { UnifiedState } from "@/lib/ysws/types";

import { fetchSubmissions } from "./airtable";

export type UnifiedMatch = {
  recordId: string;
  firstSubmittedAt: Date | null;
  email: string;
  codeUrl: string;
  projectId: string | null;
  title: string | null;
  state: UnifiedState | null;
  heldRecordId: string | null;
  why: string | null;
};

export function repoKey(url: string): string {
  const slug = githubSlug(url);
  if (slug) return slug.toLowerCase();
  return url
    .trim()
    .toLowerCase()
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
}

export async function planUnified(): Promise<UnifiedMatch[]> {
  const sent = (await fetchSubmissions()).filter((row) => row.yswsRecordId && row.email);

  const rows = await getDb()
    .select({
      projectId: projects.id,
      title: projects.title,
      repoUrl: projects.repoUrl,
      email: users.email,
      state: yswsSubmissions.state,
      recordId: yswsSubmissions.recordId,
    })
    .from(projects)
    .innerJoin(users, eq(users.sub, projects.userSub))
    .leftJoin(yswsSubmissions, eq(yswsSubmissions.projectId, projects.id));

  const byRepo = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!row.repoUrl) continue;
    byRepo.set(`${row.email.toLowerCase()}|${repoKey(row.repoUrl)}`, row);
  }

  return sent.map((row) => {
    const email = row.email!.trim().toLowerCase();
    const codeUrl = row.codeUrl ?? "";
    const match = codeUrl ? byRepo.get(`${email}|${repoKey(codeUrl)}`) : undefined;

    return {
      recordId: row.yswsRecordId!,
      firstSubmittedAt: row.firstSubmittedAt ? new Date(row.firstSubmittedAt) : null,
      email,
      codeUrl,
      projectId: match?.projectId ?? null,
      title: match?.title ?? null,
      state: match?.state ?? null,
      heldRecordId: match?.recordId ?? null,
      why: match
        ? match.recordId && match.recordId !== row.yswsRecordId
          ? `already points at ${match.recordId}`
          : null
        : codeUrl
          ? "no project on that code url for that email"
          : "the airtable row has no code url",
    };
  });
}

export async function applyUnified(
  matches: UnifiedMatch[],
): Promise<{ written: number; skipped: number }> {
  const db = getDb();
  let written = 0;
  let skipped = 0;

  for (const match of matches) {
    if (!match.projectId || match.why) {
      skipped += 1;
      continue;
    }

    const values = {
      state: "sent" as const,
      recordId: match.recordId,
      firstSubmittedAt: match.firstSubmittedAt,
      error: null,
    };

    await db
      .insert(yswsSubmissions)
      .values({ projectId: match.projectId, ...values })
      .onConflictDoUpdate({ target: yswsSubmissions.projectId, set: values });

    written += 1;
  }

  return { written, skipped };
}
