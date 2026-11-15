import type { User } from "@/lib/db/schema";

const DEFAULT_ORGANIZER_EMAILS = ["khanaslaastha88@gmail.com"];

function organizerEmails(): string[] {
  const configured = (process.env.ORGANIZER_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return [...DEFAULT_ORGANIZER_EMAILS, ...configured];
}

export function organizerSlackIds(): string[] {
  return (process.env.ORGANIZER_SLACK_IDS ?? "")
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);
}

export function isOrganizer(user: Pick<User, "slackId" | "email"> | null | undefined): boolean {
  if (!user) return false;

  const slackId = user.slackId.trim().toUpperCase();
  const email = user.email.trim().toLowerCase();

  return (
    organizerSlackIds().includes(slackId) ||
    organizerEmails().includes(email)
  );
}

export async function requireOrganizer() {
  const { getCurrentUser } = await import("./users");
  const user = await getCurrentUser();
  return isOrganizer(user) ? user : null;
}
