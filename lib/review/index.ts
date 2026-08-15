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
