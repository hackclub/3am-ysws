import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/users";
import { MAX_UPLOAD_BYTES, uploadToCdn } from "@/lib/cdn";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  wrong_type: "That has to be a png, jpg, webp or gif.",
  too_big: `That is over ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB. Try a smaller screenshot.`,
  not_configured: "Uploads are not switched on yet. Paste an image link instead.",
  failed: "That did not upload. Try again, or paste an image link instead.",
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
  } catch {
    return NextResponse.json({ error: "unreadable" }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "no_file", message: "Pick a file first." }, { status: 422 });
  }

  const outcome = await uploadToCdn(file);

  if (outcome.status === "uploaded") {
    return NextResponse.json({ ok: true, url: outcome.url });
  }

  const status = outcome.status === "not_configured" || outcome.status === "failed" ? 502 : 422;
  return NextResponse.json(
    { error: outcome.status, message: MESSAGES[outcome.status] },
    { status },
  );
}
