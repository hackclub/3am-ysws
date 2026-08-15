import type { User } from "@/lib/db/schema";

export function organizerSlackIds(): string[] {
  return (process.env.ORGANIZER_SLACK_IDS ?? "")
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);
}

export function isOrganizer(user: Pick<User, "slackId"> | null | undefined): boolean {
  if (!user) return false;
  return organizerSlackIds().includes(user.slackId.trim().toUpperCase());
}

export async function requireOrganizer() {
  const { getCurrentUser } = await import("./users");
  const user = await getCurrentUser();
  return isOrganizer(user) ? user : null;
}
