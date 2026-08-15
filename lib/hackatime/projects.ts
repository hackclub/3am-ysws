import { eq } from "drizzle-orm";

import { open } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { User } from "@/lib/db/schema";

import { getHackatimeProjects } from "./client";
import { formatHours } from "./format";

export { formatHours };

export type PickerProject = { key: string; hours: string; seconds: number };

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; projects: PickerProject[] }>();

async function forget(sub: string) {
  cache.delete(sub);
  await getDb().update(users).set({ hackatimeToken: null }).where(eq(users.sub, sub));
}

export async function getPickerProjects(
  user: Pick<User, "sub" | "hackatimeToken">,
): Promise<PickerProject[] | null> {
  if (!user.hackatimeToken) return null;

  const hit = cache.get(user.sub);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.projects;

  let token: string;
  try {
    token = open(user.hackatimeToken);
  } catch (error) {
    console.error("[hackatime] stored token could not be opened", error);
    await forget(user.sub);
    return null;
  }

  try {
    const { projects } = await getHackatimeProjects(token);
    const mapped = projects
      .filter((project) => project.name && project.total_seconds > 0)
      .sort((a, b) => b.total_seconds - a.total_seconds)
      .map((project) => ({
        key: project.name,
        seconds: project.total_seconds,
        hours: formatHours(project.total_seconds),
      }));

    cache.set(user.sub, { at: Date.now(), projects: mapped });
    return mapped;
  } catch (error) {
    console.error("[hackatime] projects fetch failed", error);
    if (error instanceof Error && error.message.includes("401")) await forget(user.sub);
    return null;
  }
}
