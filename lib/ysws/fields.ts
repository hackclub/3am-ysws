import { githubSlug } from "@/lib/ari/repo";

import type { PendingRow } from "./types";

const DAY = new Intl.DateTimeFormat("en-CA", { dateStyle: "short", timeZone: "UTC" });

export function grantMinutes(row: PendingRow): number {
  return row.overrideMinutes ?? row.approvedMinutes ?? 0;
}

export function grantHours(row: PendingRow): number {
  return Math.round((grantMinutes(row) / 60) * 100) / 100;
}

function commitsUrl(repoUrl: string): string {
  const slug = githubSlug(repoUrl);
  return slug ? `https://github.com/${slug}/commits` : repoUrl;
}

function screenshot(url: string): { url: string; filename: string }[] {
  let filename = "screenshot.png";
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop();
    if (last) filename = decodeURIComponent(last);
  } catch {
    filename = "screenshot.png";
  }
  return [{ url, filename }];
}

function section(title: string, lines: (string | null)[]): string | null {
  const body = lines
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line))
    .join("\n");
  return body ? `[${title}]\n${body}` : null;
}

export function hoursJustification(row: PendingRow): string {
  if (row.hoursJustification?.trim()) return row.hoursJustification.trim();

  const reviewed = row.decidedAt ? ` on ${DAY.format(row.decidedAt)}` : "";
  const deflated =
    row.overrideMinutes !== null &&
    row.approvedMinutes !== null &&
    row.overrideMinutes < row.approvedMinutes;

  return [
    section("HACKATIME", [
      `Hackatime ID: ${row.hackatimeId ?? "not connected"}`,
      `Hackatime Projects: ${row.hackatimeProjects.join(", ") || "none picked"}`,
    ]),
    section("SPECIFIC TECHNICAL FEATURES", [row.description, row.noteToMaker]),
    section(
      "DEFLATION JUSTIFICATION",
      deflated
        ? [
            `An organiser cut this to ${grantHours(row)}h from the ${(row.approvedMinutes ?? 0) / 60}h the review allowed.`,
          ]
        : [],
    ),
    section("ADDITIONAL JUSTIFICATION", [
      `Reviewed in 3AM and approved for ${grantHours(row)}h${reviewed}.`,
      row.repoUrl ? `Commit history: ${commitsUrl(row.repoUrl)}` : null,
    ]),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function toUnifiedFields(row: PendingRow): Record<string, unknown> {
  return {
    "First Name": row.firstName,
    "Last Name": row.lastName,
    Email: row.email,
    Birthday: row.birthday,
    "Address (Line 1)": row.addressLine1,
    "Address (Line 2)": row.addressLine2,
    City: row.city,
    "State / Province": row.stateProvince,
    "ZIP / Postal Code": row.postcode,
    Country: row.country,
    "Code URL": row.repoUrl,
    "Playable URL": row.demoUrl,
    Screenshot: row.thumbnailUrl ? screenshot(row.thumbnailUrl) : null,
    Description: row.description,
    "GitHub Username": row.repoUrl ? (githubSlug(row.repoUrl)?.split("/")[0] ?? null) : null,
    "Override Hours Spent": grantHours(row),
    "Override Hours Spent Justification": hoursJustification(row),
  };
}
