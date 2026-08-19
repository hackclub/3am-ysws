import { buildIngestPayload, validateSubmission } from "@/lib/ari/payload";
import { ariBaseUrl, ariProgramId, signBody } from "@/lib/ari/signature";

import type { ReviewBackend, ReviewSubmission, SubmitOutcome, WithdrawOutcome } from "./types";

async function readStatus(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { status?: string };
    return body.status ?? null;
  } catch {
    return null;
  }
}

async function readField(response: Response): Promise<{ field?: string; message?: string }> {
  try {
    const body = (await response.json()) as { field?: string; error?: string; message?: string };
    return { field: body.field, message: body.message ?? body.error };
  } catch {
    return {};
  }
}

async function post(path: string, body: string): Promise<Response> {
  return fetch(`${ariBaseUrl()}/api/ingest/${ariProgramId()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Ari-Signature": signBody(body),
    },
    body,
    cache: "no-store",
  });
}

export const ariBackend: ReviewBackend = {
  name: "ari",

  async submit(submission: ReviewSubmission): Promise<SubmitOutcome> {
    const invalid = validateSubmission(submission);
    if (invalid) return { status: "rejected", field: invalid.field, message: invalid.message };

    const body = JSON.stringify(buildIngestPayload(submission));

    let response: Response;
    try {
      response = await post("", body);
    } catch (error) {
      console.error("[ari] ingest request failed", error);
      return { status: "unavailable", message: "We could not reach the reviewers just now." };
    }

    if (response.status === 409) return { status: "already_queued" };

    if (response.status === 202 || response.status === 200) {
      const reported = await readStatus(response);
      return reported === "duplicate" ? { status: "already_queued" } : { status: "queued" };
    }

    if (response.status === 422) {
      const { field, message } = await readField(response);
      console.error(`[ari] ingest rejected ${submission.externalId} field=${field ?? "unknown"}`);
      return {
        status: "rejected",
        field,
        message: message ?? "The reviewers could not read that submission.",
      };
    }

    console.error(`[ari] ingest returned ${response.status} for ${submission.externalId}`);
    return { status: "unavailable", message: "We could not reach the reviewers just now." };
  },

  async withdraw(externalId: string): Promise<WithdrawOutcome> {
    const body = JSON.stringify({ external_id: externalId });

    let response: Response;
    try {
      response = await post("/withdraw", body);
    } catch (error) {
      console.error("[ari] withdraw request failed", error);
      return { status: "unavailable", message: "We could not reach the reviewers just now." };
    }

    if (response.ok) return { status: "withdrawn" };
    if (response.status === 404) return { status: "not_queued" };

    console.error(`[ari] withdraw returned ${response.status} for ${externalId}`);
    return { status: "unavailable", message: "We could not reach the reviewers just now." };
  },
};
