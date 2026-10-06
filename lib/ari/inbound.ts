import type { DecisionKind } from "@/lib/review/decisions";

export type AriDelivery = {
  event?: string;
  decision?: string | null;
  id?: string;
  external_id?: string;
  maker?: { email?: string; slack_id?: string | null };
  review?: {
    approved_minutes?: number;
    approved_hours?: number;
    note_to_maker?: string | null;
    justification?: AriJustificationPayload | null;
  };
};

type JustificationValue = string | number | Record<string, unknown> | null | undefined;

export type AriJustificationPayload = {
  technical_features?: JustificationValue | JustificationValue[];
  deflation_reason?: JustificationValue | JustificationValue[];
  hackatime_projects?: JustificationValue | JustificationValue[];
  lapse_links?: JustificationValue | JustificationValue[];
};

export type AriJustification = {
  technicalFeatures: string[];
  deflationReason: string[];
  hackatimeProjects: string[];
  lapseLinks: string[];
};

const DECISION_EVENTS: Record<string, DecisionKind> = {
  "review.approved": "approved",
  "review.changes": "changes",
  "review.rejected": "rejected",
};

export function decisionFromEvent(delivery: AriDelivery): DecisionKind | null {
  const byEvent = delivery.event ? DECISION_EVENTS[delivery.event] : undefined;
  if (byEvent) return byEvent;

  const decision = delivery.decision;
  if (decision === "approved" || decision === "changes" || decision === "rejected") {
    return decision;
  }
  return null;
}

export function approvedMinutes(delivery: AriDelivery): number {
  const review = delivery.review;
  if (!review) return 0;

  if (typeof review.approved_minutes === "number" && Number.isFinite(review.approved_minutes)) {
    return Math.max(0, Math.round(review.approved_minutes));
  }
  if (typeof review.approved_hours === "number" && Number.isFinite(review.approved_hours)) {
    return Math.max(0, Math.round(review.approved_hours * 60));
  }
  return 0;
}

export function noteToMaker(delivery: AriDelivery): string | null {
  const note = delivery.review?.note_to_maker;
  return typeof note === "string" && note.trim().length > 0 ? note.trim() : null;
}

function describe(value: JustificationValue): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object") {
    const label = [value.name, value.title, value.project, value.url, value.link].find(
      (part): part is string => typeof part === "string" && part.trim().length > 0,
    );
    const hours = [value.hours, value.approved_hours].find(
      (part): part is number => typeof part === "number" && Number.isFinite(part),
    );
    if (label) return hours !== undefined ? `${label.trim()} (${hours}h)` : label.trim();
    return JSON.stringify(value);
  }
  return null;
}

function lines(value: JustificationValue | JustificationValue[]): string[] {
  const list = Array.isArray(value) ? value : [value];
  return list.map(describe).filter((line): line is string => line !== null);
}

export function reviewJustification(delivery: AriDelivery): AriJustification | null {
  const raw = delivery.review?.justification;
  if (!raw || typeof raw !== "object") return null;

  const parsed: AriJustification = {
    technicalFeatures: lines(raw.technical_features),
    deflationReason: lines(raw.deflation_reason),
    hackatimeProjects: lines(raw.hackatime_projects),
    lapseLinks: lines(raw.lapse_links),
  };
  return Object.values(parsed).some((part) => part.length > 0) ? parsed : null;
}
