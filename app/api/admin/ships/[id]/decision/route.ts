import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { isOrganizer } from "@/lib/auth/organizer";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { applicationUrl, sendTransactionalEmail } from "@/lib/email/send";
import { renderEmail } from "@/lib/email/templates";
import { applyDecision } from "@/lib/review/decisions";

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

  const result = await applyDecision({
    projectId: id,
    decision,
    approvedMinutes: Math.round(hours * 60),
    noteToMaker: note,
  });

  if (result.status === "not_found")
    return NextResponse.json({ error: "not found" }, { status: 404 });
  if (result.status === "not_sent")
    return NextResponse.json({ error: "not_sent" }, { status: 409 });
  if (result.status === "already_decided") {
    return NextResponse.json({ error: "already_decided" }, { status: 409 });
  }

  // Notifications are a best-effort side effect: never turn a saved decision into an API failure.
  try {
    const [maker] = await getDb()
      .select()
      .from(users)
      .where(eq(users.sub, result.project.userSub))
      .limit(1);

    if (maker?.email) {
      const submissionUrl = applicationUrl("/dash/projects");
      const projectName = result.project.title;
      const eventTime = result.project.decidedAt?.getTime() ?? Date.now();
      const email =
        decision === "approved"
          ? renderEmail("approved", {
              makerName: maker.name,
              projectName,
              submissionUrl,
              nextSteps:
                result.project.approvedMinutes == null
                  ? undefined
                  : `Approved time: ${(result.project.approvedMinutes / 60).toFixed(2)} hours.`,
            })
          : decision === "changes"
            ? renderEmail("changes-requested", {
                makerName: maker.name,
                projectName,
                submissionUrl,
                reviewerMessage: result.project.noteToMaker ?? "",
              })
            : renderEmail("rejected", {
                makerName: maker.name,
                projectName,
                rejectionReason: result.project.noteToMaker ?? "",
                resubmitUrl: submissionUrl,
              });

      await sendTransactionalEmail({
        to: maker.email,
        idempotencyKey: `3am-project-${decision}-${result.project.id}-${eventTime}`,
        email,
      });
    }
  } catch {
    console.warn("[email] could not prepare project decision notification; decision was saved");
  }

  return NextResponse.json({ ok: true, decision });
}
