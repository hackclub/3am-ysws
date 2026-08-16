import { ariBackend } from "./ari";
import { localBackend } from "./local";
import type { ReviewBackend } from "./types";

export * from "./types";

export function reviewIsExternal(): boolean {
  return Boolean(process.env.ARI_PROGRAM_ID && process.env.ARI_INGEST_SECRET);
}

export function getReviewBackend(): ReviewBackend {
  return reviewIsExternal() ? ariBackend : localBackend;
}

export function reviewConfigProblems(): string[] {
  const problems: string[] = [];
  const programId = Boolean(process.env.ARI_PROGRAM_ID);
  const ingest = Boolean(process.env.ARI_INGEST_SECRET);
  const webhook = Boolean(process.env.ARI_WEBHOOK_SECRET);

  if (programId && !ingest) {
    problems.push("ARI_PROGRAM_ID is set but ARI_INGEST_SECRET is not, so ships stay local");
  }
  if (ingest && !programId) {
    problems.push("ARI_INGEST_SECRET is set but ARI_PROGRAM_ID is not, so ships stay local");
  }
  if (reviewIsExternal() && !webhook) {
    problems.push(
      "ships go to ari but ARI_WEBHOOK_SECRET is not set, so decisions cannot come back",
    );
  }
  return problems;
}
