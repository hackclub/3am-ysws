import { isVideoLink } from "@/lib/links";
import type { ReviewSubmission } from "@/lib/review/types";

export type IngestPayload = {
  external_id: string;
  title: string;
  description: string;
  maker: { email: string; name: string; slack_id: string };
  repo_url: string;
  demo_url: string;
  thumbnail_url: string;
  hackatime_projects: string[];
  evidence: string[];
  track: "software";
  is_update?: boolean;
  update_message?: string;
};

export type ValidationError = { field: string; message: string };

const EVIDENCE = ["commits", "elapsed", "devlog"];
const MAX_UPDATE_MESSAGE = 2000;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateSubmission(submission: ReviewSubmission): ValidationError | null {
  const text: [string, string][] = [
    ["title", submission.title],
    ["description", submission.description],
    ["maker.email", submission.maker.email],
    ["maker.name", submission.maker.name],
    ["maker.slack_id", submission.maker.slackId],
  ];
  for (const [field, value] of text) {
    if (!value || value.trim().length === 0) return { field, message: `${field} is required` };
  }

  const urls: [string, string, string][] = [
    ["repo_url", submission.repoUrl, "Add a link to your public repository."],
    ["demo_url", submission.demoUrl, "Add a link people can play or download."],
    ["thumbnail_url", submission.thumbnailUrl, "Add a screenshot of your project."],
  ];
  for (const [field, value, message] of urls) {
    if (!value || value.trim().length === 0) return { field, message };
    if (!isHttpUrl(value)) return { field, message: `${field} has to start with http or https` };
  }

  if (isVideoLink(submission.demoUrl)) {
    return {
      field: "demo_url",
      message: "That has to be something people can play or download, not a video of it.",
    };
  }

  if (submission.hackatimeProjects.length === 0) {
    return {
      field: "hackatime_projects",
      message: "Pick at least one Hackatime project, or we cannot count any hours.",
    };
  }

  if (submission.updateMessage && submission.updateMessage.length > MAX_UPDATE_MESSAGE) {
    return { field: "update_message", message: "Keep it under 2000 characters." };
  }

  return null;
}

export function buildIngestPayload(submission: ReviewSubmission): IngestPayload {
  const payload: IngestPayload = {
    external_id: submission.externalId,
    title: submission.title.trim(),
    description: submission.description.trim(),
    maker: {
      email: submission.maker.email.trim().toLowerCase(),
      name: submission.maker.name.trim(),
      slack_id: submission.maker.slackId.trim(),
    },
    repo_url: submission.repoUrl.trim(),
    demo_url: submission.demoUrl.trim(),
    thumbnail_url: submission.thumbnailUrl.trim(),
    hackatime_projects: submission.hackatimeProjects.map((name) => name.trim()).filter(Boolean),
    evidence: EVIDENCE,
    track: "software",
  };

  if (submission.updateMessage?.trim()) {
    payload.is_update = true;
    payload.update_message = submission.updateMessage.trim();
  } else if (submission.isUpdate) {
    payload.is_update = true;
  }

  return payload;
}
