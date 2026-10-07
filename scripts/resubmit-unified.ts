// Re-send already-submitted Unified records so they pick up the current field builder
// (e.g. the fixed "Override Hours Spent Justification").
//
//   npm run resubmit:unified -- --from 2026-10-01 --to 2026-10-05          dry run
//   npm run resubmit:unified -- --from 2026-10-01 --to 2026-10-05 --yes    actually send
//
// Dates are inclusive and read in IST. A record is picked if it was first submitted to
// Unified, or last attempted, inside the window.
import { and, eq, gte, inArray, lt, or } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { projects, yswsSubmissions } from "@/lib/db/schema";
import { previewUnified, sendToUnified } from "@/lib/ysws/submissions";

const JUSTIFICATION = "Override Hours Spent Justification";

function arg(name: string): string | null {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

function istDay(value: string | null, label: string): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    console.error(`--${label} must be a date like 2026-10-01`);
    process.exit(1);
  }
  return new Date(`${value}T00:00:00+05:30`);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const from = istDay(arg("from"), "from");
  const to = new Date(istDay(arg("to"), "to").getTime() + 24 * 60 * 60 * 1000);
  const apply = process.argv.includes("--yes");\n  const fresh = process.argv.includes("--fresh");\n  const list = (name: string) =>\n    new Set(\n      (arg(name) ?? "")\n        .split(",")\n        .map((id) => id.trim())\n        .filter(Boolean),\n    );\n  const skip = list("skip");\n  const only = list("only");

  const picked = await getDb()
    .select({
      projectId: yswsSubmissions.projectId,
      title: projects.title,
      state: yswsSubmissions.state,
      recordId: yswsSubmissions.recordId,
    })
    .from(yswsSubmissions)
    .innerJoin(projects, eq(projects.id, yswsSubmissions.projectId))
    .where(
      and(
        inArray(yswsSubmissions.state, ["sent", "queued"]),
        or(
          and(
            gte(yswsSubmissions.firstSubmittedAt, from),
            lt(yswsSubmissions.firstSubmittedAt, to),
          ),
          and(gte(yswsSubmissions.lastAttemptAt, from), lt(yswsSubmissions.lastAttemptAt, to)),
        ),
      ),
    );

  console.log(`\nWINDOW  ${from.toISOString()} → ${to.toISOString()} (IST days, inclusive)`);
  console.log(`RECORDS ${rows.length}\n`);

  for (const row of rows) {
    console.log(
      `── ${row.title.slice(0, 40)}  ${row.projectId}  ${row.state}  ${row.recordId ?? "-"}`,
    );
    const preview = await previewUnified(row.projectId, fresh);
    if (preview.status === "ready" || preview.status === "blocked") {\n      console.log(\n        `   yswsRecordId → ${String(preview.payload.yswsRecordId ?? "(none: new record)")}`,\n      );
      const text = String((preview.payload.fields as Record<string, unknown>)[JUSTIFICATION]);
      console.log(text.replace(/^/gm, "   "));
      if (preview.problem) console.log(`   ! would be held: ${preview.problem.message}`);
    } else {
      console.log(`   ! ${preview.status}`);
    }
    console.log();
  }

  if (!apply) {
    console.log("Nothing sent. Check the justifications above, then re-run with --yes.\n");
    process.exit(1);
  }

  const tally: Record<string, number> = {};
  for (const row of rows) {
    const report = await sendToUnified(row.projectId, true, fresh);
    tally[report.status] = (tally[report.status] ?? 0) + 1;
    const detail = "message" in report ? `  ${report.message}` : "";
    console.log(`${report.status.padEnd(12)} ${row.title.slice(0, 40)}${detail}`);
    await sleep(500);
  }

  console.log("\nRESULT");
  for (const [status, count] of Object.entries(tally))
    console.log(`  ${status.padEnd(12)} ${count}`);
  console.log("\nOpen /dash/unified so queued rows refresh to sent.\n");
  process.exit(0);
}

run();
