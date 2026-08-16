export type Tone = "ok" | "info" | "warn" | "bad" | "queued" | "muted";

export type ProjectStatus =
  | "draft"
  | "gathering"
  | "queued"
  | "reviewing"
  | "checking"
  | "approved"
  | "changes"
  | "rejected"
  | "withdrawn";

export const PROJECT_STATUS: Record<ProjectStatus, { word: string; tone: Tone }> = {
  draft: { word: "draft", tone: "muted" },
  gathering: { word: "gathering your hours", tone: "queued" },
  queued: { word: "in the queue", tone: "queued" },
  reviewing: { word: "being reviewed", tone: "info" },
  checking: { word: "almost there, one more check", tone: "queued" },
  approved: { word: "approved", tone: "ok" },
  changes: { word: "needs changes", tone: "warn" },
  rejected: { word: "not approved", tone: "bad" },
  withdrawn: { word: "withdrawn", tone: "muted" },
};

export type OrderStatus = "placed" | "packing" | "needsAddress" | "posted" | "cancelled";

export const ORDER_STATUS: Record<OrderStatus, { word: string; tone: Tone }> = {
  placed: { word: "placed", tone: "queued" },
  packing: { word: "being packed", tone: "info" },
  needsAddress: { word: "we need your address", tone: "warn" },
  posted: { word: "posted", tone: "ok" },
  cancelled: { word: "cancelled", tone: "bad" },
};
