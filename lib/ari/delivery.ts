import { signDelivery, signaturesMatch } from "./signature";

export const DELIVERY_TOLERANCE_SECONDS = 300;

export type DeliveryHeaders = {
  signature: string | null;
  timestamp: string | null;
  deliveryId: string | null;
};

export type DeliveryCheck =
  | { ok: true; deliveryId: string }
  | { ok: false; reason: "missing_headers" | "bad_timestamp" | "stale" | "bad_signature" };

export function readDeliveryHeaders(headers: Headers): DeliveryHeaders {
  return {
    signature: headers.get("x-ari-signature"),
    timestamp: headers.get("x-ari-timestamp"),
    deliveryId: headers.get("x-ari-delivery-id"),
  };
}

export function verifyDelivery(
  raw: string,
  headers: DeliveryHeaders,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): DeliveryCheck {
  const { signature, timestamp, deliveryId } = headers;
  if (!signature || !timestamp || !deliveryId) return { ok: false, reason: "missing_headers" };

  if (!/^\d+$/.test(timestamp)) return { ok: false, reason: "bad_timestamp" };

  const sent = Number(timestamp);
  if (Math.abs(nowSeconds - sent) > DELIVERY_TOLERANCE_SECONDS) {
    return { ok: false, reason: "stale" };
  }

  const expected = signDelivery(timestamp, deliveryId, raw, secret);
  if (!signaturesMatch(signature, expected)) return { ok: false, reason: "bad_signature" };

  return { ok: true, deliveryId };
}
