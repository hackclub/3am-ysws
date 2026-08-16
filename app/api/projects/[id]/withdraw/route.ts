import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { getReviewBackend } from "@/lib/review";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userSub, user.sub)))
    .limit(1);

  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!project.submittedAt) return NextResponse.json({ error: "not_sent" }, { status: 409 });
  if (project.decision) return NextResponse.json({ error: "already_decided" }, { status: 409 });

  const outcome = await getReviewBackend().withdraw(project.id);

  if (outcome.status === "unavailable") {
    return NextResponse.json({ error: "unavailable", message: outcome.message }, { status: 503 });
  }

  await db
    .update(projects)
    .set({ decision: "withdrawn", decidedAt: new Date() })
    .where(eq(projects.id, project.id));

  return NextResponse.json({ ok: true, status: "withdrawn" });
}
