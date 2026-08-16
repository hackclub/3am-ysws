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
  };
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
