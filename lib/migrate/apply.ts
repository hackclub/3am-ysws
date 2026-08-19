import { eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { beansLedger, projects, users } from "@/lib/db/schema";

import type { Plan } from "./plan";

export type ImportCounts = {
  usersCreated: number;
  usersExisting: number;
  projectsCreated: number;
  projectsExisting: number;
};

export async function importUsersAndProjects(plan: Plan): Promise<ImportCounts> {
  const db = getDb();
  const counts: ImportCounts = {
    usersCreated: 0,
    usersExisting: 0,
    projectsCreated: 0,
    projectsExisting: 0,
  };

  const subBySlackId = new Map<string, string>();

  for (const user of plan.users) {
    const [existing] = await db
      .select({ sub: users.sub })
      .from(users)
      .where(eq(users.slackId, user.slackId))
      .limit(1);

    if (existing) {
      subBySlackId.set(user.slackId, existing.sub);
      counts.usersExisting += 1;
      continue;
    }

    const [created] = await db
      .insert(users)
      .values({
        sub: user.sub,
        email: user.email,
        name: user.name,
        slackId: user.slackId,
        fullName: user.fullName,
        addressLine1: user.addressLine1,
        addressLine2: user.addressLine2,
        city: user.city,
        postcode: user.postcode,
        country: user.country,
      })
      .onConflictDoNothing()
      .returning({ sub: users.sub });

    if (created) {
      subBySlackId.set(user.slackId, created.sub);
      counts.usersCreated += 1;
    }
  }

  for (const project of plan.projects) {
    const sub = subBySlackId.get(project.slackId);
    if (!sub) continue;

    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(sql`${projects.userSub} = ${sub} and ${projects.repoUrl} = ${project.repoUrl}`)
      .limit(1);

    if (existing) {
      counts.projectsExisting += 1;
      continue;
    }

    const submittedAt = new Date(project.submittedAt);

    await db.insert(projects).values({
      userSub: sub,
      title: project.title,
      description: project.description,
      repoUrl: project.repoUrl,
      demoUrl: project.demoUrl,
      thumbnailUrl: null,
      hackatimeProjects: project.hackatimeProjects,
      createdAt: submittedAt,
      submittedAt,
      decision: project.decision,
      approvedMinutes: project.approvedMinutes,
      noteToMaker: project.noteToMaker,
      decidedAt: project.decision ? submittedAt : null,
    });

    counts.projectsCreated += 1;
  }

  return counts;
}

export const MIGRATION_NOTE = "migrated from Airtable";

export type BeansCounts = { created: number; existing: number; unmatched: number };

export async function importBeans(plan: Plan): Promise<BeansCounts> {
  const db = getDb();
  const counts: BeansCounts = { created: 0, existing: 0, unmatched: 0 };

  for (const entry of plan.beans) {
    const [maker] = await db
      .select({ sub: users.sub })
      .from(users)
      .where(eq(users.slackId, entry.slackId))
      .limit(1);

    if (!maker) {
      counts.unmatched += 1;
      continue;
    }

    const [already] = await db
      .select({ id: beansLedger.id })
      .from(beansLedger)
      .where(sql`${beansLedger.userSub} = ${maker.sub} and ${beansLedger.note} = ${MIGRATION_NOTE}`)
      .limit(1);

    if (already) {
      counts.existing += 1;
      continue;
    }

    await db.insert(beansLedger).values({
      userSub: maker.sub,
      delta: entry.delta,
      reason: "manual",
      note: MIGRATION_NOTE,
    });

    counts.created += 1;
  }

  return counts;
}
