import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { isOrganizer } from "@/lib/auth/organizer";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { beansLedger, users } from "@/lib/db/schema";
import { sendSlackDm } from "@/lib/slack/notifications";

export const dynamic = "force-dynamic";

type Body = { mode?: "remind_all" | "custom"; userSub?: string; message?: string };

function invalid(message: string, status = 422) {
  return NextResponse.json({ error: "invalid", message }, { status });
}

function shopUrl(): string {
  const configured = process.env.APP_URL?.trim() || "https://3am.hackclub.com";
  try {
    const base = new URL(configured);
    if (base.protocol !== "https:" && base.hostname !== "localhost" && base.hostname !== "127.0.0.1") {
      return "https://3am.hackclub.com/dash/shop";
    }
    return new URL("/dash/shop", base).toString();
  } catch {
    return "https://3am.hackclub.com/dash/shop";
  }
}

export async function POST(request: Request) {
  const organizer = await getCurrentUser();
  if (!isOrganizer(organizer)) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return invalid("Could not read the request.", 400);
  }

  const db = getDb();

  if (body.mode === "custom") {
    const userSub = typeof body.userSub === "string" ? body.userSub : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!userSub) return invalid("Choose a maker first.");
    if (!message || message.length > 3000) return invalid("Write a message up to 3,000 characters.");
    const [maker] = await db.select({ name: users.name, slackId: users.slackId }).from(users).where(eq(users.sub, userSub)).limit(1);
    if (!maker) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (!/^[UW][A-Z0-9]+$/.test(maker.slackId)) return invalid("This maker does not have a usable Slack ID.");
    const sent = await sendSlackDm(maker.slackId, message);
    if (!sent) return NextResponse.json({ error: "slack_failed", message: "Slack did not confirm delivery. Check the bot token and DM permissions." }, { status: 502 });
    return NextResponse.json({ ok: true, sent: 1, skipped: 0 });
  }

  if (body.mode !== "remind_all") return invalid("Choose a valid message action.");

  const reminder = [
    "🌱 *A little 3AM bean reminder!*",
    "",
    "You have beans waiting to be spent. Head to the 3AM shop, browse the rewards, and put those beans to use:",
    `<${shopUrl()}|Open the 3AM shop>`,
    "",
    "No rush—just don't forget they're there. Happy shipping! ☕",
  ].join("\n");

  const makers = await db
    .select({
      slackId: users.slackId,
      balance: sql<number>`coalesce((select sum(${beansLedger.delta}) from ${beansLedger} where ${beansLedger.userSub} = ${users.sub}), 0)`,
    })
    .from(users);

  let sent = 0;
  let skipped = 0;
  for (const maker of makers) {
    if (Number(maker.balance) <= 0 || !/^[UW][A-Z0-9]+$/.test(maker.slackId)) {
      skipped++;
      continue;
    }
    if (await sendSlackDm(maker.slackId, reminder)) sent++;
    else skipped++;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
