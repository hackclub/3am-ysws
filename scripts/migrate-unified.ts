import { applyUnified, planUnified } from "@/lib/migrate/unified";

async function run() {
  const matches = await planUnified();
  const ready = matches.filter((match) => match.projectId && !match.why);
  const stuck = matches.filter((match) => !match.projectId || match.why);

  console.log(`\nALREADY IN UNIFIED  ${matches.length}`);
  console.log(`  can mark as sent  ${ready.length}`);
  console.log(`  cannot match      ${stuck.length}`);

  if (ready.length > 0) {
    console.log("\nWOULD MARK AS SENT");
    for (const match of ready) {
      const when = match.firstSubmittedAt?.toISOString().slice(0, 10) ?? "no date";
      console.log(`  ${(match.title ?? "").slice(0, 30).padEnd(32)} ${match.recordId}  ${when}`);
    }
  }

  if (stuck.length > 0) {
    console.log("\nCANNOT MATCH");
    for (const match of stuck) {
      console.log(`  ${match.email.padEnd(38)} ${match.why}`);
      console.log(`  ${"".padEnd(38)} ${match.codeUrl}`);
    }
  }

  if (!process.argv.includes("--yes")) {
    console.log("\nNothing written. Re-run with --yes to apply.\n");
    process.exit(1);
  }

  const { written, skipped } = await applyUnified(matches);

  console.log("\nRESULT");
  console.log(`  written ${written}`);
  console.log(`  skipped ${skipped}`);
  console.log();
  process.exit(0);
}

run();
