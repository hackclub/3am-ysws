import { hcaIssuer } from "./hca";

export type EligibilityResult =
  | "needs_submission"
  | "pending"
  | "verified_eligible"
  | "verified_but_over_18"
  | "rejected"
  | "not_found";

const TIMEOUT_MS = 8000;
const ATTEMPTS = 2;

/**
 * Returns the maker's eligibility, or `null` when it could not be determined
 * (network failure, timeout, non-2xx from HCA). Callers must treat `null` as
 * "unknown", NOT as "ineligible" — the auth service is reached over the public
 * internet and intermittently times out from the cluster.
 */
export async function checkEligibility(lookup: {
  slackId?: string;
  email?: string;
}): Promise<EligibilityResult | null> {
  const url = new URL(`${hcaIssuer()}/api/external/check`);
  if (lookup.slackId) url.searchParams.set("slack_id", lookup.slackId);
  else if (lookup.email) url.searchParams.set("email", lookup.email);
  else return null;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        console.error(`[auth] eligibility check returned ${response.status} (attempt ${attempt})`);
        if (response.status < 500) return null;
        continue;
      }
      const body = (await response.json()) as { result?: string };
      return (body.result as EligibilityResult) ?? null;
    } catch (error) {
      console.error(`[auth] eligibility check failed (attempt ${attempt})`, error);
    }
  }
  return null;
}

export function canShip(result: EligibilityResult | null): boolean {
  return result === "verified_eligible";
}
