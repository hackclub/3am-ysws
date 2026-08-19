import { readQueued, sendQueued } from "@/lib/migrate/queue";
import { getReviewBackend, reviewIsExternal } from "@/lib/review";

function limitFrom(argv: string[]): number | null {
  const flag = argv.find((entry) => entry.startsWith("--limit="));
  if (!flag) return null;
  const value = Number(flag.split("=")[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

async function run() {
  const rows = await readQueued();
  const ready = rows.filter((row) => !row.problem);
  const blocked = rows.filter((row) => row.problem);

  console.log(`\nQUEUED LOCALLY  ${rows.length}`);
  console.log(`  ready to send ${ready.length}`);
  console.log(`  cannot send   ${blocked.length}`);

  if (blocked.length > 0) {
    console.log("\nCANNOT SEND");
    for (const row of blocked) {
      console.log(`  ${row.submission.title.slice(0, 32).padEnd(34)} ${row.problem?.message}`);
    }
  }

  if (!process.argv.includes("--yes")) {
    console.log(`\nBackend would be "${getReviewBackend().name}". Re-run with --yes to send.\n`);
    process.exit(1);
  }

  if (!reviewIsExternal()) {
    console.log(
      "\nARI_PROGRAM_ID and ARI_INGEST_SECRET are not both set, so this would only log.\n",
    );
    process.exit(1);
  }

  const limit = limitFrom(process.argv);
  const batch = limit ? ready.slice(0, limit) : ready;

  console.log(`\nSENDING ${batch.length}\n`);

  const { counts, failed } = await sendQueued(batch, (line) => console.log(line));

  console.log("\nRESULT");
  console.log(`  sent        ${counts.sent}`);
  console.log(`  already     ${counts.already}`);
  console.log(`  ari refused ${counts.refused}`);
  console.log(`  unreachable ${counts.unavailable}`);

  if (failed.length > 0) {
    console.log("\nFAILED");
    for (const note of failed) {
      console.log(`  ${note.title.slice(0, 32).padEnd(34)} ${note.why}`);
    }
  }

  console.log();
  process.exit(0);
}

run();
