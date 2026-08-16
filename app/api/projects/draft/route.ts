import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type Body = {
  id?: string;
  title?: string;
  description?: string;
  repoUrl?: string;
  demoUrl?: string;
  thumbnailUrl?: string;
  hackatimeProjects?: string[];
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "unreadable" }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "no_title" }, { status: 422 });

  const db = getDb();
  const values = {
    title,
    description: body.description?.trim() || null,
    repoUrl: body.repoUrl?.trim() || null,
    demoUrl: body.demoUrl?.trim() || null,
    thumbnailUrl: body.thumbnailUrl?.trim() || null,
    hackatimeProjects: body.hackatimeProjects ?? [],
  };

  try {
    if (body.id) {
      const existing = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, body.id), eq(projects.userSub, user.sub)))
        .limit(1);

      if (existing.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
      if (existing[0].submittedAt && !existing[0].decision) {
        return NextResponse.json({ error: "already_queued" }, { status: 409 });
      }

      await db.update(projects).set(values).where(eq(projects.id, body.id));
      return NextResponse.json({ ok: true, id: body.id });
    }

    const [row] = await db
      .insert(projects)
      .values({ ...values, userSub: user.sub })
      .returning({ id: projects.id });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (error) {
    const codes = [error, (error as { cause?: unknown })?.cause];
    if (codes.some((value) => (value as { code?: string })?.code === "23505")) {
      return NextResponse.json({ error: "duplicate_repo" }, { status: 409 });
    }
    throw error;
  }
}
