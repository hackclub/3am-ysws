import type { PendingOrder, ShopRow, Submission } from "./plan";

const BASE = "https://api.airtable.com/v0";

function token(): string {
  const value = process.env.AIRTABLE_TOKEN?.trim();
  if (!value) throw new Error("AIRTABLE_TOKEN is not set");
  return value;
}

function baseId(): string {
  const value = process.env.AIRTABLE_BASE_ID?.trim();
  if (!value) throw new Error("AIRTABLE_BASE_ID is not set");
  return value;
}

type Record_ = { id: string; createdTime: string; fields: Record<string, unknown> };

async function fetchAll(table: string): Promise<Record_[]> {
  const rows: Record_[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`${BASE}/${baseId()}/${encodeURIComponent(table)}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token()}` },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`airtable ${table} returned ${response.status}`);
    }

    const body = (await response.json()) as { records: Record_[]; offset?: string };
    rows.push(...body.records);
    offset = body.offset;
  } while (offset);

  return rows;
}

function text(fields: Record<string, unknown>, name: string): string | null {
  const value = fields[name];
  return typeof value === "string" && value.trim() ? value : null;
}

function num(fields: Record<string, unknown>, name: string): number | null {
  const value = fields[name];
  return typeof value === "number" ? value : null;
}

function flag(fields: Record<string, unknown>, name: string): boolean | null {
  const value = fields[name];
  return typeof value === "boolean" ? value : null;
}

function firstAttachment(fields: Record<string, unknown>, name: string): string | null {
  const value = fields[name];
  if (!Array.isArray(value) || value.length === 0) return null;
  const first = value[0] as { url?: string };
  return typeof first.url === "string" ? first.url : null;
}

export async function fetchSubmissions(): Promise<Submission[]> {
  const rows = await fetchAll("YSWS Project Submission");
  return rows.map((row) => ({
    id: row.id,
    createdTime: row.createdTime,
    email: text(row.fields, "Email"),
    firstName: text(row.fields, "First Name"),
    lastName: text(row.fields, "Last Name"),
    slackId: text(row.fields, "Slack ID"),
    codeUrl: text(row.fields, "Code URL"),
    playableUrl: text(row.fields, "Playable URL"),
    description: text(row.fields, "Description"),
    hackatimeUrl: text(row.fields, "Hackatime URL"),
    overrideHours: num(row.fields, "Optional - Override Hours Spent"),
    yswsRecordId: text(row.fields, "Automation - YSWS Record ID"),
    firstSubmittedAt: text(row.fields, "Automation - First Submitted At"),
    rejected: flag(row.fields, "Rejected"),
    rejectionReason: text(row.fields, "Rejection Reason to send to user (If ANY)"),
    reviewerStatus: Array.isArray(row.fields["Status (Internal Reviewer)"])
      ? (row.fields["Status (Internal Reviewer)"] as string[])
      : null,
    fulfilled: flag(row.fields, "Fulfilled"),
    screenshotUrl: firstAttachment(row.fields, "Screenshot"),
    addressLine1: text(row.fields, "Address (Line 1)"),
    addressLine2: text(row.fields, "Address (Line 2)"),
    city: text(row.fields, "City"),
    postcode: text(row.fields, "ZIP / Postal Code"),
    country: text(row.fields, "Country"),
  }));
}

export async function fetchShopRows(): Promise<ShopRow[]> {
  const rows = await fetchAll("Shop Data :D");
  return rows.map((row) => ({
    email: text(row.fields, "Email"),
    beans: Number(row.fields["Coffee Beans "] ?? 0) || 0,
    manualAdd: num(row.fields, "Add coffee Beans (emergency + testing only)"),
  }));
}

export async function fetchPendingOrders(): Promise<PendingOrder[]> {
  const rows = await fetchAll("Orders");
  return rows.map((row) => ({
    id: row.id,
    email: text(row.fields, "User Email"),
    beans: num(row.fields, "Total Beans"),
    details: text(row.fields, "Order Details"),
    submittedAt: text(row.fields, "Submitted At"),
  }));
}
