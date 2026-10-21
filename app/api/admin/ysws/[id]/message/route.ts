import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { isOrganizer } from "@/lib/auth/organizer";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";
import { sendSlackDm } from "@/lib/slack/notifications";

export const dynamic = "force-dynamic";

const MISSING = NextResponse.json({ error: "not found" }, { status: 404 });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isOrganizer(await getCurrentUser())) return MISSING;
  const { id } = await params;

  let message = "";
  try {
    const body = (await request.json()) as { message?: unknown };
    message = typeof body.message === "string" ? body.message.trim() : "";
  } catch {
    return NextResponse.json({ error: "unreadable" }, { status: 400 });
  }

  if (!message || message.length > 3000) {
    return NextResponse.json({ error: "invalid", message: "Write a message up to 3,000 characters." }, { status: 422 });
  }

  const [maker] = await getDb()
    .select({ slackId: users.slackId })
    .from(projects)
    .innerJoin(users, eq(users.sub, projects.userSub))
    .where(eq(projects.id, id))
    .limit(1);

  if (!maker) return MISSING;
  if (!/^[UW][A-Z0-9]+$/.test(maker.slackId)) {
    return NextResponse.json({ error: "invalid", message: "This maker does not have a usable Slack ID." }, { status: 422 });
  }

  const sent = await sendSlackDm(maker.slackId, message);
  if (!sent) {
    return NextResponse.json({ error: "slack_failed", message: "Slack did not confirm delivery. Check the bot token and DM permissions." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
