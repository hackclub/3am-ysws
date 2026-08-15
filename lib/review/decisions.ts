import { and, eq, isNotNull, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import type { Project } from "@/lib/db/schema";

export type DecisionKind = "approved" | "changes" | "rejected";

export type DecisionInput = {
  projectId: string;
  decision: DecisionKind;
  approvedMinutes: number;
  noteToMaker: string | null;
  decidedAt?: Date;
};

export type ApplyResult =
  | { status: "applied"; project: Project }
  | { status: "not_found" }
  | { status: "not_sent" }
  | { status: "already_decided" };

export async function applyDecision(input: DecisionInput): Promise<ApplyResult> {
  const db = getDb();

  const [updated] = await db
    .update(projects)
    .set({
      decision: input.decision,
      approvedMinutes: input.decision === "approved" ? Math.max(0, input.approvedMinutes) : 0,
      noteToMaker: input.noteToMaker,
      decidedAt: input.decidedAt ?? new Date(),
    })
    .where(
      and(
        eq(projects.id, input.projectId),
        isNotNull(projects.submittedAt),
        isNull(projects.decision),
      ),
    )
    .returning();

  if (updated) return { status: "applied", project: updated };

  const [existing] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .limit(1);

  if (!existing) return { status: "not_found" };
  if (!existing.submittedAt) return { status: "not_sent" };
  return { status: "already_decided" };
}

export type ClearResult = { status: "cleared" | "was_open" | "not_found" };

export async function clearDecision(projectId: string): Promise<ClearResult> {
  const db = getDb();

  const [updated] = await db
    .update(projects)
    .set({ decision: null, approvedMinutes: null, noteToMaker: null, decidedAt: null })
    .where(and(eq(projects.id, projectId), isNotNull(projects.decision)))
    .returning({ id: projects.id });

  if (updated) return { status: "cleared" };

  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  return { status: existing ? "was_open" : "not_found" };
}
