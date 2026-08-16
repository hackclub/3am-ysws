import type { ProjectStatus } from "@/lib/status";

import { ariBaseUrl, ariIngestSecret, ariProgramId } from "./signature";

export type AriPhase =
  | "processing"
  | "fraud_review"
  | "review"
  | "under_review"
  | "second_pass"
  | "reviewed"
  | "withdrawn"
  | "reverted";

export type AriStatus = { phase?: AriPhase; decision?: string | null; version?: number };

const TTL_MS = 30_000;
const cache = new Map<string, { at: number; status: AriStatus | null }>();

export function phaseToStatus(phase: AriPhase | undefined): ProjectStatus | null {
  switch (phase) {
    case "processing":
      return "gathering";
    case "fraud_review":
    case "second_pass":
      return "checking";
    case "review":
    case "reverted":
      return "queued";
    case "under_review":
      return "reviewing";
    case "withdrawn":
      return "withdrawn";
    default:
      return null;
  }
}

export async function fetchAriStatus(externalId: string): Promise<AriStatus | null> {
  const hit = cache.get(externalId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.status;

  let status: AriStatus | null = null;
  try {
    const url = new URL(`${ariBaseUrl()}/api/ingest/${ariProgramId()}/status`);
    url.searchParams.set("external_id", externalId);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${ariIngestSecret()}` },
      cache: "no-store",
    });

    if (response.ok) {
      status = (await response.json()) as AriStatus;
    } else if (response.status !== 404) {
      console.error(`[ari] status returned ${response.status} for ${externalId}`);
    }
  } catch (error) {
    console.error("[ari] status request failed", error);
  }

  cache.set(externalId, { at: Date.now(), status });
  return status;
}

export async function livePhaseStatus(externalId: string): Promise<ProjectStatus | null> {
  const status = await fetchAriStatus(externalId);
  return status ? phaseToStatus(status.phase) : null;
}
