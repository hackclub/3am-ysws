import { importUsersAndProjects } from "@/lib/migrate/apply";
import { fetchPendingOrders, fetchShopRows, fetchSubmissions } from "@/lib/migrate/airtable";
import { buildPlan } from "@/lib/migrate/plan";

async function run() {
  if (!process.argv.includes("--yes")) {
    console.log("\nThis writes users and projects. Re-run with --yes when you are ready.\n");
    process.exit(1);
  }

  const [submissions, shop, orders] = await Promise.all([
    fetchSubmissions(),
    fetchShopRows(),
    fetchPendingOrders(),
  ]);

  const plan = buildPlan(submissions, shop, orders);
  console.log(`planned ${plan.users.length} users and ${plan.projects.length} projects`);

  const counts = await importUsersAndProjects(plan);

  console.log("\nUSERS");
  console.log(`  created   ${counts.usersCreated}`);
  console.log(`  already   ${counts.usersExisting}`);
  console.log("\nPROJECTS");
  console.log(`  created   ${counts.projectsCreated}`);
  console.log(`  already   ${counts.projectsExisting}`);
  console.log("\nBeans, orders and screenshots are separate steps.\n");

  process.exit(0);
}

run();
