import type { ManualShipment } from "@/lib/db/schema";
import { displayItemName, trackingGuideLines } from "@/lib/fulfilment/tracking";

// Manual shipments are independent of shop orders: nothing here touches
// orders, beans, payments or stock.

export const MANUAL_ITEMS = ["Stickers", "3AM Swag Kit"] as const;
export const MANUAL_STATUSES = ["packing", "posted", "delivered"] as const;
export type ManualItem = (typeof MANUAL_ITEMS)[number];
export type ManualStatus = (typeof MANUAL_STATUSES)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isShipmentId = (value: string) => UUID.test(value);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLACK_ID = /^[UW][A-Z0-9]{2,}$/;

// Text fields an organizer can set, with their limits and whether they are required.
const FIELDS = {
  recipientName: { max: 160, required: true, label: "Recipient name" },
  recipientEmail: { max: 254, required: true, label: "Recipient email" },
  slackId: { max: 30, required: false, label: "Slack member ID" },
  itemName: { max: 80, required: true, label: "Item" },
  addressLine1: { max: 300, required: true, label: "Address line 1" },
  addressLine2: { max: 300, required: false, label: "Address line 2" },
  city: { max: 120, required: true, label: "City" },
  stateProvince: { max: 120, required: false, label: "State / province" },
  postcode: { max: 40, required: true, label: "Postal code" },
  country: { max: 100, required: true, label: "Country" },
  courier: { max: 120, required: false, label: "Courier" },
  tracking: { max: 200, required: false, label: "Tracking ID" },
  notes: { max: 2000, required: false, label: "Internal notes" },
} as const;

export type ShipmentField = keyof typeof FIELDS;
export type ShipmentValues = { [K in ShipmentField]?: string | null };
export type ParseResult = { ok: true; values: ShipmentValues } | { ok: false; field: string; message: string };

/**
 * Validates organizer input. With `partial`, only the fields present in `body`
 * are checked and returned (for edits); otherwise every required field must be set.
 */
export function parseShipmentInput(body: Record<string, unknown>, partial: boolean): ParseResult {
  const values: ShipmentValues = {};
  for (const [field, rule] of Object.entries(FIELDS) as [ShipmentField, (typeof FIELDS)[ShipmentField]][]) {
    const raw = body[field];
    if (raw === undefined) {
      if (!partial && rule.required) return { ok: false, field, message: `${rule.label} is required.` };
      continue;
    }
    if (raw !== null && typeof raw !== "string") return { ok: false, field, message: `${rule.label} must be text.` };
    // Notes keep their line breaks; every other field collapses whitespace.
    const text = field === "notes" ? (raw ?? "").trim() : (raw ?? "").replace(/\s+/g, " ").trim();
    if (text.length > rule.max) return { ok: false, field, message: `${rule.label} is too long (max ${rule.max} characters).` };
    if (rule.required && !text) return { ok: false, field, message: `${rule.label} is required.` };
    values[field] = text || null;
  }

  if (values.recipientEmail) {
    values.recipientEmail = values.recipientEmail.toLowerCase();
    if (!EMAIL.test(values.recipientEmail)) return { ok: false, field: "recipientEmail", message: "Enter a valid recipient email." };
  }
  if (values.slackId) {
    values.slackId = values.slackId.toUpperCase();
    if (!SLACK_ID.test(values.slackId)) return { ok: false, field: "slackId", message: "Slack member ID must look like U0123ABCD (starts with U or W)." };
  }
  if (values.itemName && !MANUAL_ITEMS.includes(values.itemName as ManualItem)) {
    return { ok: false, field: "itemName", message: "Item must be Stickers or 3AM Swag Kit." };
  }
  return { ok: true, values };
}

export function parseStatus(value: unknown): ManualStatus | null | undefined {
  if (value === undefined) return undefined;
  return typeof value === "string" && MANUAL_STATUSES.includes(value as ManualStatus) ? (value as ManualStatus) : null;
}

/** Timestamp changes for a status move. Dates stay put when the status does not change. */
export function statusTimestamps(existing: Pick<ManualShipment, "status" | "dispatchedAt" | "deliveredAt">, next: ManualStatus, now: Date) {
  if (next === existing.status) return {};
  if (next === "packing") return { dispatchedAt: null, deliveredAt: null };
  if (next === "posted") return { dispatchedAt: existing.dispatchedAt ?? now, deliveredAt: null };
  return { dispatchedAt: existing.dispatchedAt ?? now, deliveredAt: now };
}

function escapeSlack(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Slack only pings people written as <@MEMBER_ID>. Set these to real member IDs to get pings;
// without them the names are written as plain text.
//   MANUAL_SHIPMENT_SENT_BY_SLACK_IDS  comma-separated, e.g. "U0AAA,U0BBB" (hridhaan, agm)
//   MANUAL_SHIPMENT_PACKED_BY_SLACK_ID e.g. "U0BBB" (agm)
function mentions(envValue: string | undefined, fallback: string[]) {
  const ids = (envValue ?? "").split(",").map((v) => v.trim().toUpperCase()).filter((v) => /^[UW][A-Z0-9]{2,}$/.test(v));
  const names = ids.length ? ids.map((id) => `<@${id}>`) : fallback;
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
}

const isDomestic = (country: string) => /^\s*(india|in|bharat)\s*$/i.test(country);

export function dispatchMessage(shipment: Pick<ManualShipment, "recipientName" | "itemName" | "courier" | "tracking" | "country">) {
  const item = displayItemName(shipment.itemName);
  const sentBy = mentions(process.env.MANUAL_SHIPMENT_SENT_BY_SLACK_IDS, ["@hridhaan", "@agm"]);
  const packedBy = mentions(process.env.MANUAL_SHIPMENT_PACKED_BY_SLACK_ID, ["@agm"]);
  const lines = [
    "📦 *Your 3AM shipment has been dispatched!*",
    `Hey ${escapeSlack(shipment.recipientName.split(" ")[0] || "there")}, your *${escapeSlack(item)}* ${/s$/i.test(item.trim()) ? "are on their way" : "is on its way"}.`,
    "",
    `Packed by ${packedBy}. Sent to you by ${sentBy}.`,
  ];
  if (shipment.courier) lines.push("", `*Courier:* ${escapeSlack(shipment.courier)}`);
  if (shipment.tracking) lines.push("", ...trackingGuideLines(shipment.tracking, shipment.courier, escapeSlack));
  if (!isDomestic(shipment.country)) {
    lines.push(
      "",
      "*A note on customs:* this package is declared as a gift. Hack Club and the 3AM team are not responsible for customs duties or import charges. If customs in your country asks for a fee, paying it is the recipient's responsibility.",
    );
  }
  lines.push("", "If you have questions, DM the 3AM team in Hack Club Slack.");
  return lines.join("\n");
}

/** A claimed "sending" older than this is treated as abandoned and may be retried. */
export const STALE_SEND_MS = 2 * 60 * 1000;

// What the browser receives: dates as ISO strings so server and client agree.
export type ManualShipmentView = Omit<ManualShipment, "createdAt" | "dispatchedAt" | "deliveredAt" | "updatedAt" | "notifyAttemptedAt" | "notifiedAt"> & {
  createdAt: string;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
  notifyAttemptedAt: string | null;
  notifiedAt: string | null;
};

const iso = (value: Date | null) => (value ? value.toISOString() : null);

export function toShipmentView(row: ManualShipment): ManualShipmentView {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    dispatchedAt: iso(row.dispatchedAt),
    deliveredAt: iso(row.deliveredAt),
    updatedAt: row.updatedAt.toISOString(),
    notifyAttemptedAt: iso(row.notifyAttemptedAt),
    notifiedAt: iso(row.notifiedAt),
  };
}
