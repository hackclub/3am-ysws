import { drizzle } from "drizzle-orm/postgres-js";
import { inArray, like, sql } from "drizzle-orm";
import postgres from "postgres";

import { connectionUrl } from "@/lib/db/url";
import * as schema from "@/lib/db/schema";
import { beansLedger, items, orders, projects, users } from "@/lib/db/schema";
import { MIGRATION_NOTE } from "@/lib/migrate/apply";
import { normaliseItemName } from "@/lib/migrate/plan";

type Db = ReturnType<typeof connect>;

function connect(url: string) {
  return drizzle(postgres(connectionUrl(url), { max: 4, connect_timeout: 20 }), { schema });
}

function sourceUrl(): string {
  if (process.env.SOURCE_DATABASE_URL) return process.env.SOURCE_DATABASE_URL;
  const user = process.env.POSTGRES_USER ?? "3am";
  const password = process.env.POSTGRES_PASSWORD ?? "3am";
  const port = process.env.POSTGRES_PORT ?? "5432";
  const name = process.env.POSTGRES_DB ?? "3am";
  return `postgres://${user}:${password}@127.0.0.1:${port}/${name}`;
}

type Counts = {
  usersInserted: number;
  usersAdopted: number;
  projectsInserted: number;
  projectsSkipped: number;
  beansInserted: number;
  beansSkipped: number;
  ordersInserted: number;
  ordersSkipped: number;
};

async function promote(source: Db, target: Db, apply: boolean) {
  const counts: Counts = {
    usersInserted: 0,
    usersAdopted: 0,
    projectsInserted: 0,
    projectsSkipped: 0,
    beansInserted: 0,
    beansSkipped: 0,
    ordersInserted: 0,
    ordersSkipped: 0,
  };
  const notes: string[] = [];

  const sourceUsers = await source
    .select()
    .from(users)
    .where(like(users.sub, "airtable:%"))
    .orderBy(users.slackId);

  const sourceSubs = sourceUsers.map((row) => row.sub);

  const sourceProjects =
    sourceSubs.length > 0
      ? await source.select().from(projects).where(inArray(projects.userSub, sourceSubs))
      : [];

  const sourceBeans =
    sourceSubs.length > 0
      ? await source
          .select()
          .from(beansLedger)
          .where(
            sql`${beansLedger.userSub} in ${sourceSubs} and ${beansLedger.note} = ${MIGRATION_NOTE}`,
          )
      : [];

  const sourceOrders =
    sourceSubs.length > 0
      ? await source
          .select()
          .from(orders)
          .where(
            sql`${orders.userSub} in ${sourceSubs} and ${orders.adminNote} like ${MIGRATION_NOTE + "%"}`,
          )
      : [];

  const targetUsers = await target.select({ sub: users.sub, slackId: users.slackId }).from(users);
  const subBySlackId = new Map(targetUsers.map((row) => [row.slackId, row.sub]));

  const targetProjects = await target
    .select({ id: projects.id, userSub: projects.userSub, repoUrl: projects.repoUrl })
    .from(projects);
  const existingIds = new Set(targetProjects.map((row) => row.id));
  const existingRepos = new Set(targetProjects.map((row) => `${row.userSub}|${row.repoUrl}`));

  const targetItems = await target
    .select({ id: items.id, name: items.name, cost: items.cost })
    .from(items);
  const itemByName = new Map(targetItems.map((row) => [normaliseItemName(row.name), row]));

  const subFor = new Map<string, string>();

  for (const row of sourceUsers) {
    const existing = subBySlackId.get(row.slackId);
    if (existing) {
      subFor.set(row.sub, existing);
      counts.usersAdopted += 1;
      continue;
    }

    subFor.set(row.sub, row.sub);
    counts.usersInserted += 1;

    if (!apply) continue;

    await target
      .insert(users)
      .values({
        sub: row.sub,
        email: row.email,
        name: row.name,
        slackId: row.slackId,
        fullName: row.fullName,
        addressLine1: row.addressLine1,
        addressLine2: row.addressLine2,
        city: row.city,
        postcode: row.postcode,
        country: row.country,
      })
      .onConflictDoNothing();
  }

  for (const row of sourceProjects) {
    const sub = subFor.get(row.userSub);
    if (!sub) continue;

    if (existingIds.has(row.id)) {
      counts.projectsSkipped += 1;
      continue;
    }

    if (existingRepos.has(`${sub}|${row.repoUrl}`)) {
      counts.projectsSkipped += 1;
      notes.push(`repo already there, keeping theirs: ${row.title} ${row.repoUrl}`);
      continue;
    }

    counts.projectsInserted += 1;
    if (!apply) continue;

    await target
      .insert(projects)
      .values({
        id: row.id,
        userSub: sub,
        title: row.title,
        description: row.description,
        repoUrl: row.repoUrl,
        demoUrl: row.demoUrl,
        thumbnailUrl: row.thumbnailUrl,
        hackatimeProjects: row.hackatimeProjects,
        createdAt: row.createdAt,
        submittedAt: row.submittedAt,
        decision: row.decision,
        approvedMinutes: row.approvedMinutes,
        noteToMaker: row.noteToMaker,
        decidedAt: row.decidedAt,
      })
      .onConflictDoNothing();
  }

  for (const row of sourceBeans) {
    const sub = subFor.get(row.userSub);
    if (!sub) continue;

    const [already] = await target
      .select({ id: beansLedger.id })
      .from(beansLedger)
      .where(sql`${beansLedger.userSub} = ${sub} and ${beansLedger.note} = ${MIGRATION_NOTE}`)
      .limit(1);

    if (already) {
      counts.beansSkipped += 1;
      continue;
    }

    counts.beansInserted += 1;
    if (!apply) continue;

    await target.insert(beansLedger).values({
      userSub: sub,
      delta: row.delta,
      reason: row.reason,
      projectId: null,
      note: row.note,
      createdAt: row.createdAt,
    });
  }

  for (const row of sourceOrders) {
    const sub = subFor.get(row.userSub);
    if (!sub) continue;

    const [already] = await target
      .select({ id: orders.id })
      .from(orders)
      .where(
        sql`${orders.userSub} = ${sub} and ${orders.itemName} = ${row.itemName} and ${orders.adminNote} = ${row.adminNote}`,
      )
      .limit(1);

    if (already) {
      counts.ordersSkipped += 1;
      continue;
    }

    const match = itemByName.get(normaliseItemName(row.itemName));
    const itemId = match && match.cost === row.cost ? match.id : null;
    if (!itemId) notes.push(`order has no shop item in production: ${row.itemName}`);

    counts.ordersInserted += 1;
    if (!apply) continue;

    await target.insert(orders).values({
      userSub: sub,
      itemId,
      itemName: row.itemName,
      cost: row.cost,
      status: row.status,
      fullName: row.fullName,
      email: row.email,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      city: row.city,
      postcode: row.postcode,
      country: row.country,
      adminNote: row.adminNote,
      createdAt: row.createdAt,
    });
  }

  return { counts, notes };
}

async function run() {
  const targetRaw = process.env.DATABASE_URL;
  if (!targetRaw) {
    console.log("\nDATABASE_URL is not set. Point it at the target database.\n");
    process.exit(1);
  }

  const apply = process.argv.includes("--yes");
  const source = connect(sourceUrl());
  const target = connect(targetRaw);

  const [[sourceName], [targetName]] = await Promise.all([
    source.execute<{ db: string }>(sql`select current_database() as db`),
    target.execute<{ db: string }>(sql`select current_database() as db`),
  ]);

  console.log(`\nfrom ${sourceName.db}  to ${targetName.db}`);
  if (sourceName.db === targetName.db) {
    console.log("\nSource and target are the same database. Stopping.\n");
    process.exit(1);
  }

  const { counts, notes } = await promote(source, target, apply);

  console.log(apply ? "\nAPPLIED" : "\nWOULD DO");
  console.log(`  users     ${counts.usersInserted} new, ${counts.usersAdopted} already signed in`);
  console.log(`  projects  ${counts.projectsInserted} in, ${counts.projectsSkipped} skipped`);
  console.log(`  beans     ${counts.beansInserted} in, ${counts.beansSkipped} skipped`);
  console.log(`  orders    ${counts.ordersInserted} in, ${counts.ordersSkipped} skipped`);

  if (notes.length > 0) {
    console.log("\nNOTES");
    for (const note of notes) console.log(`  ${note}`);
  }

  if (!apply) console.log("\nNothing was written. Re-run with --yes.");
  console.log();
  process.exit(0);
}

run();
