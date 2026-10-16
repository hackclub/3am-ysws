import { NextResponse } from "next/server";

import { isOrganizer } from "@/lib/auth/organizer";
import { getCurrentUser } from "@/lib/auth/users";
import { sendMissingDetailsReminder } from "@/lib/slack/notifications";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isOrganizer(await getCurrentUser())) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { id } = await params;
  const sent = await sendMissingDetailsReminder(id);
  if (!sent) {
    return NextResponse.json(
      { error: "not_sent", message: "Reminder was not sent. The project may not be approved, the maker may have completed their details, or Slack is not configured." },
      { status: 422 },
    );
  }

  return NextResponse.json({ ok: true });
}
