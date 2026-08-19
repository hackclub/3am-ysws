import { fetchPendingOrders, fetchShopRows, fetchSubmissions } from "@/lib/migrate/airtable";
import { buildPlan } from "@/lib/migrate/plan";

function line(label: string, value: string | number) {
  console.log(`  ${label.padEnd(26)} ${value}`);
}

async function report() {
  const [submissions, shop, orders] = await Promise.all([
    fetchSubmissions(),
    fetchShopRows(),
    fetchPendingOrders(),
  ]);

  const plan = buildPlan(submissions, shop, orders);

  console.log("\nSOURCE");
  line("submissions", submissions.length);
  line("shop rows", shop.length);
  line("pending orders", orders.length);

  console.log("\nWOULD CREATE");
  line("users", plan.users.length);
  line("projects", plan.projects.length);
  line("beans entries", plan.beans.length);
  line("orders", plan.orders.length);

  const approved = plan.projects.filter((p) => p.decision === "approved");
  const rejected = plan.projects.filter((p) => p.decision === "rejected");
  const queued = plan.projects.filter((p) => p.decision === null);

  console.log("\nPROJECT STATES");
  line(
    "approved",
    `${approved.length} (${approved.reduce((t, p) => t + (p.approvedMinutes ?? 0), 0) / 60}h)`,
  );
  line(
    "rejected",
    `${rejected.length}, ${rejected.filter((p) => !p.noteToMaker).length} with no reason`,
  );
  line("into the queue", queued.length);
  line("no repo url", plan.projects.filter((p) => !p.repoUrl).length);
  line("no screenshot", plan.projects.filter((p) => !p.screenshotUrl).length);
  line(
    "no hackatime project",
    plan.projects.filter((p) => p.hackatimeProjects.length === 0).length,
  );

  const collapsed = plan.projects.filter((p) => p.supersedes.length > 0);
  console.log(`\nCOLLAPSED DUPLICATES (${collapsed.length})`);
  for (const project of collapsed) {
    console.log(
      `  ${project.title}  keeps ${project.sourceId}, drops ${project.supersedes.length}`,
    );
  }

  const rounded = plan.beans.filter((b) => b.delta !== b.raw);
  console.log(`\nBEANS (${plan.beans.length} entries, ${rounded.length} rounded)`);
  for (const entry of plan.beans) {
    const note = entry.delta === entry.raw ? "" : `  (was ${entry.raw})`;
    console.log(`  ${entry.email.padEnd(34)} ${String(entry.delta).padStart(5)}${note}`);
  }

  console.log(`\nORDERS (${plan.orders.length})`);
  for (const order of plan.orders) {
    console.log(`  ${order.slackId}  ${order.cost} beans  ${order.itemName}`);
  }

  console.log(`\nSKIPPED (${plan.skips.length})`);
  for (const skip of plan.skips) {
    console.log(`  ${skip.what.padEnd(11)} ${skip.id.padEnd(22)} ${skip.why}`);
  }

  console.log("\nEVERY PROJECT");
  for (const project of plan.projects) {
    const state = project.decision ?? "queued";
    const hours = project.approvedMinutes ? ` ${project.approvedMinutes / 60}h` : "";
    console.log(`  ${state.padEnd(8)}${hours.padEnd(6)} ${project.slackId}  ${project.title}`);
  }

  console.log("\nNothing was written. This was a dry run.\n");
  process.exit(0);
}

report();
