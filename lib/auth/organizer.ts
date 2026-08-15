import type { User } from "@/lib/db/schema";

export function organizerEmails(): string[] {
  return (process.env.ORGANIZER_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isOrganizer(user: Pick<User, "email"> | null | undefined): boolean {
  if (!user) return false;
  return organizerEmails().includes(user.email.trim().toLowerCase());
}
