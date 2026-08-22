import { toUnifiedFields } from "./fields";
import { yswsBridgeSecret, yswsBridgeUrl, yswsProgramId } from "./config";
import type { PendingRow } from "./types";

const TIMEOUT_MS = 20_000;

export type SendOutcome =
  | { status: "sent"; recordId: string | null }
  | { status: "refused"; message: string }
  | { status: "unavailable"; message: string };

const RECORD_KEYS = ["yswsRecordId", "recordId", "record_id", "id"];

function readRecordId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;

  const source = body as Record<string, unknown>;
  const nested = source.record ?? source.data;
  for (const key of RECORD_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value.startsWith("rec")) return value;
  }
  return nested ? readRecordId(nested) : null;
}

export function buildPayload(row: PendingRow, programId: string): Record<string, unknown> {
  return {
    source: "3am",
    recordId: row.projectId,
    yswsRecordId: row.recordId,
    yswsProgramId: programId,
    overrides: { duplicateJustification: row.duplicateJustification },
    fields: toUnifiedFields(row),
  };
}

export async function send(row: PendingRow): Promise<SendOutcome> {
  const body = JSON.stringify(buildPayload(row, yswsProgramId()));

  let response: Response;
  try {
    response = await fetch(yswsBridgeUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${yswsBridgeSecret()}`,
        "Content-Type": "application/json",
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.error("[ysws] bridge request failed", error);
    return { status: "unavailable", message: "We could not reach the submissions bridge." };
  }

  const text = await response.text().catch(() => "");

  if (response.status === 200 || response.status === 201 || response.status === 202) {
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    const recordId = readRecordId(parsed);
    if (!recordId) {
      console.info(`[ysws] bridge accepted ${row.projectId} without naming a record`);
    }
    return { status: "sent", recordId };
  }

  console.error(`[ysws] bridge returned ${response.status} for ${row.projectId}: ${text}`);

  if (response.status >= 400 && response.status < 500) {
    return { status: "refused", message: `The bridge refused it (${response.status}). ${text}` };
  }
  return { status: "unavailable", message: `The bridge is unwell (${response.status}).` };
}
