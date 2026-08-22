const BASE = "https://api.airtable.com/v0";
const TIMEOUT_MS = 15_000;

export type OutboxRow = {
  recordId: string;
  yswsRecordId: string | null;
  error: string | null;
  firstSubmittedAt: string | null;
};

type Fields = Record<string, unknown>;
type Record_ = { id: string; fields: Fields };

function token(): string {
  const value = process.env.AIRTABLE_TOKEN?.trim();
  if (!value) throw new Error("AIRTABLE_TOKEN is not set");
  return value;
}

export function outboxBaseId(): string {
  const value = process.env.AIRTABLE_BASE_ID?.trim();
  if (!value) throw new Error("AIRTABLE_BASE_ID is not set");
  return value;
}

export function outboxTableId(): string {
  return process.env.YSWS_OUTBOX_TABLE_ID?.trim() || "tblGpstw5PJgVnqLt";
}

function text(fields: Fields, name: string): string | null {
  const value = fields[name];
  return typeof value === "string" && value.trim() ? value : null;
}

function toRow(record: Record_): OutboxRow {
  return {
    recordId: record.id,
    yswsRecordId: text(record.fields, "Automation - YSWS Record ID"),
    error: text(record.fields, "Automation - Error"),
    firstSubmittedAt: text(record.fields, "Automation - First Submitted At"),
  };
}

async function call(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${BASE}/${outboxBaseId()}/${outboxTableId()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`airtable outbox returned ${response.status}: ${body}`);
  }

  return response.json();
}

export async function findOutbox(projectId: string): Promise<OutboxRow | null> {
  const formula = encodeURIComponent(`{Project}='${projectId}'`);
  const body = (await call(`?filterByFormula=${formula}&maxRecords=1`)) as { records: Record_[] };
  const record = body.records[0];
  return record ? toRow(record) : null;
}

export async function ensureOutbox(projectId: string, title: string): Promise<OutboxRow> {
  const existing = await findOutbox(projectId);
  if (existing) return existing;

  const body = (await call("", {
    method: "POST",
    body: JSON.stringify({ fields: { Project: projectId, Title: title } }),
  })) as Record_;

  return toRow(body);
}
