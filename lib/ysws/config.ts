export function yswsBridgeUrl(): string {
  return (
    process.env.YSWS_BRIDGE_URL ?? "https://bridge.hackclub.com/v1/unified-submissions/upsert"
  ).replace(/\/$/, "");
}

export function yswsBridgeSecret(): string {
  const value = process.env.YSWS_BRIDGE_SECRET;
  if (!value) throw new Error("YSWS_BRIDGE_SECRET is not set");
  return value;
}

export function yswsProgramId(): string {
  const value = process.env.YSWS_PROGRAM_ID;
  if (!value) throw new Error("YSWS_PROGRAM_ID is not set");
  return value;
}

export function yswsIsConfigured(): boolean {
  return Boolean(process.env.YSWS_BRIDGE_SECRET && process.env.YSWS_PROGRAM_ID);
}
