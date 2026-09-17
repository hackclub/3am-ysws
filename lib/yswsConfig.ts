import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { yswsConfig } from "@/lib/db/schema";

export type YswsEventConfig = {
  submissionDeadline: Date | null;
  submissionsOpen: boolean;
  resubmissionsOpen: boolean;
};

const DEFAULT_CONFIG: YswsEventConfig = {
  submissionDeadline: null,
  submissionsOpen: true,
  resubmissionsOpen: true,
};

export async function getYswsConfig(): Promise<YswsEventConfig> {
  try {
    const [row] = await getDb().select().from(yswsConfig).where(eq(yswsConfig.id, 1)).limit(1);
    if (!row) return DEFAULT_CONFIG;
    return {
      submissionDeadline: row.submissionDeadline,
      submissionsOpen: row.submissionsOpen,
      resubmissionsOpen: row.resubmissionsOpen,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function deadlineHasPassed(config: YswsEventConfig, now = new Date()): boolean {
  return Boolean(config.submissionDeadline && config.submissionDeadline.getTime() <= now.getTime());
}

export function submissionsAreOpen(config: YswsEventConfig, now = new Date()): boolean {
  return config.submissionsOpen && !deadlineHasPassed(config, now);
}

export function resubmissionsAreOpen(config: YswsEventConfig, now = new Date()): boolean {
  return submissionsAreOpen(config, now) && config.resubmissionsOpen;
}
