import type { Project } from "@/lib/db/schema";
import type { ProjectStatus } from "@/lib/status";

export function projectStatus(project: Pick<Project, "submittedAt" | "decision">): ProjectStatus {
  if (!project.submittedAt) return "draft";

  switch (project.decision) {
    case "approved":
      return "approved";
    case "changes":
      return "changes";
    case "rejected":
      return "rejected";
    case "withdrawn":
      return "withdrawn";
    default:
      return "queued";
  }
}

export function isOpen(project: Pick<Project, "submittedAt" | "decision">): boolean {
  return Boolean(project.submittedAt) && !project.decision;
}
