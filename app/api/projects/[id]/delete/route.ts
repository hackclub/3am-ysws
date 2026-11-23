import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// Deletes a draft the maker owns. Only drafts that were never sent in can go:
// anything that reached the reviewers keeps its history (use withdraw instead).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const [project] = await db
    .select({ id: projects.id, submittedAt: projects.submittedAt })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userSub, user.sub)))
    .limit(1);

  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (project.submittedAt) {
    return NextResponse.json(
      { error: "already_sent", message: "This one was already sent in, so withdraw it instead." },
      { status: 409 },
    );
  }

  const deleted = await db
    .delete(projects)
    .where(
      and(
        eq(projects.id, project.id),
        eq(projects.userSub, user.sub),
        isNull(projects.submittedAt),
      ),
    )
    .returning({ id: projects.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "already_sent" }, { status: 409 });
  }

  return NextResponse.json({ ok: true, status: "deleted" });
}
