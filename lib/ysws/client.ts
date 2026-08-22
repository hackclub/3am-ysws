import { toUnifiedFields } from "./fields";
import { yswsBridgeSecret, yswsBridgeUrl, yswsProgramId } from "./config";
import { outboxBaseId, outboxTableId } from "./outbox";
import type { OutboxRow } from "./outbox";
import type { PendingRow } from "./types";

const TIMEOUT_MS = 20_000;

export type SendOutcome =
  | { status: "accepted" }
  | { status: "refused"; message: string }
  | { status: "unavailable"; message: string };

export function buildPayload(
  row: PendingRow,
  programId: string,
  outbox: OutboxRow | null,
): Record<string, unknown> {
  return {
    source: "3am",
    baseId: outboxBaseId(),
    tableId: outboxTableId(),
    recordId: outbox?.recordId ?? "(no outbox row yet)",
    yswsRecordId: outbox?.yswsRecordId ?? row.recordId,
    firstSubmittedAt: outbox?.firstSubmittedAt ?? null,
    yswsProgramId: programId,
    overrides: { duplicateJustification: row.duplicateJustification },
    fields: toUnifiedFields(row),
  };
}

export async function send(row: PendingRow, outbox: OutboxRow): Promise<SendOutcome> {
  const body = JSON.stringify(buildPayload(row, yswsProgramId(), outbox));

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
    console.info(`[ysws] bridge accepted ${row.projectId}, waiting on the writeback`);
    return { status: "accepted" };
  }

  console.error(`[ysws] bridge returned ${response.status} for ${row.projectId}: ${text}`);

  if (response.status >= 400 && response.status < 500) {
    return { status: "refused", message: `The bridge refused it (${response.status}). ${text}` };
  }
  return { status: "unavailable", message: `The bridge is unwell (${response.status}).` };
}
