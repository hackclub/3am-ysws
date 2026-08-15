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

export async function creditApproval(project: Pick<Project, "id" | "userSub" | "approvedMinutes">) {
  const delta = beansForMinutes(project.approvedMinutes);
  if (delta <= 0) return { credited: 0 };

  const inserted = await getDb()
    .insert(beansLedger)
    .values({
      userSub: project.userSub,
      delta,
      reason: "approval",
      projectId: project.id,
    })
    .onConflictDoNothing()
    .returning({ id: beansLedger.id });

  return { credited: inserted.length > 0 ? delta : 0 };
}
