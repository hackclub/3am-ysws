import { createHmac, timingSafeEqual } from "node:crypto";

export function ariIngestSecret(): string {
  const value = process.env.ARI_INGEST_SECRET;
  if (!value) throw new Error("ARI_INGEST_SECRET is not set");
  return value;
}

export function ariWebhookSecret(): string {
  const value = process.env.ARI_WEBHOOK_SECRET;
  if (!value) throw new Error("ARI_WEBHOOK_SECRET is not set");
  return value;
}

export function ariProgramId(): string {
  const value = process.env.ARI_PROGRAM_ID;
  if (!value) throw new Error("ARI_PROGRAM_ID is not set");
  return value;
}

export function ariBaseUrl(): string {
  return (process.env.ARI_BASE_URL ?? "https://webhooks.ari.hackclub.com").replace(/\/$/, "");
}

export function signBody(body: string, secret: string = ariIngestSecret()): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

export function signDelivery(
  timestamp: string,
  deliveryId: string,
  body: string,
  secret: string = ariWebhookSecret(),
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${deliveryId}.${body}`, "utf8")
    .digest("hex");
}

export function signaturesMatch(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
