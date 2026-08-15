import { hcaIssuer } from "./hca";

export type EligibilityResult =
  | "needs_submission"
  | "pending"
  | "verified_eligible"
  | "verified_but_over_18"
  | "rejected"
  | "not_found";

export async function checkEligibility(lookup: {
  slackId?: string;
  email?: string;
}): Promise<EligibilityResult | null> {
  const url = new URL(`${hcaIssuer()}/api/external/check`);
  if (lookup.slackId) url.searchParams.set("slack_id", lookup.slackId);
  else if (lookup.email) url.searchParams.set("email", lookup.email);
  else return null;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const body = (await response.json()) as { result?: string };
    return (body.result as EligibilityResult) ?? null;
  } catch (error) {
    console.error("[auth] eligibility check failed", error);
    return null;
  }
}

export function canShip(result: EligibilityResult | null): boolean {
  return result === "verified_eligible";
}
