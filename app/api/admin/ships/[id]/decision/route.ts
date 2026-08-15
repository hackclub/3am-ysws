import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { isOrganizer } from "@/lib/auth/organizer";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const DECISIONS = ["approved", "changes", "rejected"] as const;
type Decision = (typeof DECISIONS)[number];

type Body = { decision?: string; approvedHours?: number; noteToMaker?: string };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const organizer = await getCurrentUser();
  if (!isOrganizer(organizer)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { id } = await params;
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "unreadable" }, { status: 400 });
  }

  const decision = body.decision as Decision;
  if (!DECISIONS.includes(decision)) {
    return NextResponse.json({ error: "invalid", field: "decision" }, { status: 422 });
  }

  const hours = Number(body.approvedHours ?? 0);
  if (decision === "approved" && (!Number.isFinite(hours) || hours <= 0)) {
    return NextResponse.json(
      { error: "invalid", field: "approvedHours", message: "Approved hours must be above zero." },
      { status: 422 },
    );
  }

  const note = body.noteToMaker?.trim() || null;
  if (decision !== "approved" && !note) {
    return NextResponse.json(
      { error: "invalid", field: "noteToMaker", message: "Say why, the maker only sees this." },
      { status: 422 },
    );
  }

  const db = getDb();
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);

  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!project.submittedAt) return NextResponse.json({ error: "not_sent" }, { status: 409 });
  if (project.decision) return NextResponse.json({ error: "already_decided" }, { status: 409 });

  await db
    .update(projects)
    .set({
      decision,
      approvedMinutes: decision === "approved" ? Math.round(hours * 60) : 0,
      noteToMaker: note,
      decidedAt: new Date(),
    })
    .where(eq(projects.id, project.id));

  return NextResponse.json({ ok: true, decision });
}
