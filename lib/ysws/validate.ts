import { ageOn, MIN_AGE, missingForGrant } from "@/lib/grant";
import { isMovingImage, isVideoLink } from "@/lib/links";

import { grantMinutes } from "./fields";
import type { GateProblem, PendingRow } from "./types";

const THIN_HISTORY_MINUTES = 120;

export function validate(row: PendingRow, now = new Date()): GateProblem | null {
  const missing = missingForGrant(row);
  if (missing.length > 0) {
    return { field: "maker", message: `The maker still owes us ${missing.join(", ")}.` };
  }

  const project: [string, string | null, string][] = [
    ["description", row.description, "The project has no description."],
    ["code_url", row.repoUrl, "The project has no code url."],
    ["playable_url", row.demoUrl, "The project has no playable url."],
    ["screenshot", row.thumbnailUrl, "The project has no screenshot."],
  ];
  for (const [field, value, message] of project) {
    if (!value?.trim()) return { field, message };
  }

  if (row.thumbnailUrl && isMovingImage(row.thumbnailUrl)) {
    return {
      field: "screenshot",
      message: "The screenshot moves, and it has to be a still image.",
    };
  }
  if (row.demoUrl && isVideoLink(row.demoUrl)) {
    return { field: "playable_url", message: "The playable url is a video of the project." };
  }

  const age = ageOn(row.birthday ?? "", row.decidedAt ?? now);
  if (Number.isNaN(age)) {
    return { field: "birthday", message: "We cannot read the birthday on file." };
  }
  if (age < MIN_AGE) {
    return {
      field: "birthday",
      message: `The maker was ${age} at review, under the ${MIN_AGE} floor.`,
    };
  }
  if (age >= 18 && !row.ageJustification?.trim()) {
    return {
      field: "age_justification",
      message: `The maker was ${age} at review, so this needs an age justification.`,
    };
  }

  const minutes = grantMinutes(row);
  if (minutes <= 0) {
    return { field: "hours", message: "No hours were approved, so there is nothing to grant." };
  }

  if (row.commits !== null && row.commits <= 1 && minutes > THIN_HISTORY_MINUTES) {
    return {
      field: "commits",
      message: `${minutes / 60}h of work sits on ${row.commits} commit, which the guidelines do not accept.`,
    };
  }

  if (row.sharedCodeUrl && !row.duplicateJustification?.trim()) {
    return {
      field: "duplicate_justification",
      message: "Another project shares this code url, so this needs a duplicate justification.",
    };
  }

  return null;
}
