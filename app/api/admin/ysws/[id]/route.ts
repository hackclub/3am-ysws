import { NextResponse } from "next/server";

import { isOrganizer } from "@/lib/auth/organizer";
import { getCurrentUser } from "@/lib/auth/users";
import { previewUnified, saveOverrides, sendToUnified } from "@/lib/ysws/submissions";

export const dynamic = "force-dynamic";

const MISSING = NextResponse.json({ error: "not found" }, { status: 404 });

async function organizer(): Promise<boolean> {
  return isOrganizer(await getCurrentUser());
}

type Params = { params: Promise<{ id: string }> };

type Body = {
  overrideHours?: number | null;
  ageJustification?: string | null;
  duplicateJustification?: string | null;
};

export async function GET(request: Request, { params }: Params) {
  if (!(await organizer())) return MISSING;

  const { id } = await params;
  const preview = await previewUnified(id);

  if (preview.status === "not_found") return MISSING;
  if (preview.status === "not_approved") {
    return NextResponse.json({ error: "not_approved" }, { status: 409 });
  }

  return NextResponse.json(preview);
}

export async function POST(request: Request, { params }: Params) {
  if (!(await organizer())) return MISSING;

  const { id } = await params;
  const report = await sendToUnified(id);

  switch (report.status) {
    case "accepted":
      return NextResponse.json({ ok: true, state: "processing" });
    case "held":
      return NextResponse.json(
        { error: "held", field: report.field, message: report.message },
        { status: 422 },
      );
    case "refused":
      return NextResponse.json({ error: "refused", message: report.message }, { status: 422 });
    case "unavailable":
      return NextResponse.json({ error: "unavailable", message: report.message }, { status: 503 });
    case "already_sent":
      return NextResponse.json({ error: "already_sent" }, { status: 409 });
    case "not_approved":
      return NextResponse.json({ error: "not_approved" }, { status: 409 });
    default:
      return MISSING;
  }
}

export async function PATCH(request: Request, { params }: Params) {
  if (!(await organizer())) return MISSING;

  const { id } = await params;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "unreadable" }, { status: 400 });
  }

  const hours = body.overrideHours;
  if (hours !== null && hours !== undefined && (!Number.isFinite(hours) || hours <= 0)) {
    return NextResponse.json(
      {
        error: "invalid",
        field: "overrideHours",
        message: "Override hours have to be above zero, or empty.",
      },
      { status: 422 },
    );
  }

  const saved = await saveOverrides(id, {
    overrideMinutes: hours ? Math.round(hours * 60) : null,
    ageJustification: body.ageJustification?.trim() || null,
    duplicateJustification: body.duplicateJustification?.trim() || null,
  });

  return saved ? NextResponse.json({ ok: true }) : MISSING;
}
