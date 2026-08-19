import { fetchPendingOrders, fetchShopRows, fetchSubmissions } from "@/lib/migrate/airtable";
import { buildPlan } from "@/lib/migrate/plan";
import { importScreenshots } from "@/lib/migrate/screenshots";

function limitFrom(argv: string[]): number | null {
  const flag = argv.find((entry) => entry.startsWith("--limit="));
  if (!flag) return null;
  const value = Number(flag.split("=")[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

async function run() {
  if (!process.argv.includes("--yes")) {
    console.log("\nThis downloads from Airtable and uploads to the CDN. Re-run with --yes.\n");
    process.exit(1);
  }

  const [submissions, shop, orders] = await Promise.all([
    fetchSubmissions(),
    fetchShopRows(),
    fetchPendingOrders(),
  ]);

  const plan = buildPlan(submissions, shop, orders);
  const limit = limitFrom(process.argv);
  if (limit) plan.projects = plan.projects.slice(0, limit);

  console.log(`\nMOVING ${plan.projects.length} screenshots\n`);

  const { counts, failures } = await importScreenshots(plan, (line) => console.log(line));

  console.log("\nRESULT");
  console.log(`  uploaded  ${counts.uploaded}`);
  console.log(`  already   ${counts.already}`);
  console.log(`  no source ${counts.noSource}`);
  console.log(`  unmatched ${counts.unmatched}`);
  console.log(`  failed    ${counts.failed}`);

  if (failures.length > 0) {
    console.log("\nFAILED");
    for (const failure of failures) {
      console.log(`  ${failure.title.slice(0, 40).padEnd(42)} ${failure.why}`);
    }
  }

  console.log();
  process.exit(0);
}

run();
