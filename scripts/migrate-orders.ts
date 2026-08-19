import { fetchPendingOrders, fetchShopRows, fetchSubmissions } from "@/lib/migrate/airtable";
import { importOrders } from "@/lib/migrate/apply";
import { buildPlan } from "@/lib/migrate/plan";

async function run() {
  if (!process.argv.includes("--yes")) {
    console.log("\nThis writes orders. Re-run with --yes when you are ready.\n");
    process.exit(1);
  }

  const [submissions, shop, pending] = await Promise.all([
    fetchSubmissions(),
    fetchShopRows(),
    fetchPendingOrders(),
  ]);

  const plan = buildPlan(submissions, shop, pending);

  console.log("\nPLANNED");
  for (const order of plan.orders) {
    const when = order.placedAt?.slice(0, 10) ?? "no date";
    console.log(
      `  ${when}  ${order.slackId}  ${String(order.cost).padStart(3)}  ${order.itemName}`,
    );
  }

  const counts = await importOrders(plan);

  console.log("\nRESULT");
  console.log(`  created   ${counts.created}`);
  console.log(`  already   ${counts.existing}`);
  console.log(`  unmatched ${counts.unmatched}`);
  console.log(`  no item   ${counts.unlinked}`);
  console.log("\nBeans are not deducted. The migrated balances already account for these.\n");

  process.exit(0);
}

run();
