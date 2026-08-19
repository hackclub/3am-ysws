import { fetchPendingOrders, fetchShopRows, fetchSubmissions } from "@/lib/migrate/airtable";
import { importBeans } from "@/lib/migrate/apply";
import { buildPlan } from "@/lib/migrate/plan";

async function run() {
  if (!process.argv.includes("--yes")) {
    console.log("\nThis writes ledger entries. Re-run with --yes when you are ready.\n");
    process.exit(1);
  }

  const [submissions, shop, orders] = await Promise.all([
    fetchSubmissions(),
    fetchShopRows(),
    fetchPendingOrders(),
  ]);

  const plan = buildPlan(submissions, shop, orders);

  console.log("\nPLANNED");
  for (const entry of plan.beans) {
    const note = entry.delta === entry.raw ? "" : `  (was ${entry.raw})`;
    console.log(`  ${entry.email.padEnd(32)} ${String(entry.delta).padStart(5)}${note}`);
  }

  const counts = await importBeans(plan);

  console.log("\nRESULT");
  console.log(`  created   ${counts.created}`);
  console.log(`  already   ${counts.existing}`);
  console.log(`  unmatched ${counts.unmatched}`);
  console.log();

  process.exit(0);
}

run();
