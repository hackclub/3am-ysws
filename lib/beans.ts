import { eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { beansLedger } from "@/lib/db/schema";
import type { Project } from "@/lib/db/schema";
import { BEANS_PER_HOUR } from "@/lib/rewards";

export function beansForMinutes(minutes: number | null | undefined): number {
  if (!minutes || minutes <= 0) return 0;
  return Math.floor(minutes / 60) * BEANS_PER_HOUR;
}

export async function balanceFor(userSub: string): Promise<number> {
  const [row] = await getDb()
    .select({ total: sql<number>`coalesce(sum(${beansLedger.delta}), 0)::int` })
    .from(beansLedger)
    .where(eq(beansLedger.userSub, userSub));
  return row?.total ?? 0;
}

export async function netForProject(projectId: string): Promise<number> {
  const [row] = await getDb()
    .select({ total: sql<number>`coalesce(sum(${beansLedger.delta}), 0)::int` })
    .from(beansLedger)
    .where(eq(beansLedger.projectId, projectId));
  return row?.total ?? 0;
}

export async function reconcileProjectBeans(
  project: Pick<Project, "id" | "userSub" | "decision" | "approvedMinutes">,
): Promise<{ delta: number }> {
  const target = project.decision === "approved" ? beansForMinutes(project.approvedMinutes) : 0;
  const net = await netForProject(project.id);
  const delta = target - net;

  if (delta === 0) return { delta: 0 };

  await getDb()
    .insert(beansLedger)
    .values({
      userSub: project.userSub,
      delta,
      reason: delta > 0 ? "approval" : "revert",
      projectId: project.id,
    });

  return { delta };
}
