export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export type UploadOutcome =
  | { status: "uploaded"; url: string }
  | { status: "too_big" }
  | { status: "wrong_type" }
  | { status: "not_configured" }
  | { status: "failed" };

function cdnToken(): string | null {
  return process.env.CDN_TOKEN?.trim() || null;
}

export async function uploadToCdn(file: File): Promise<UploadOutcome> {
  if (!ALLOWED_TYPES.includes(file.type)) return { status: "wrong_type" };
  if (file.size > MAX_UPLOAD_BYTES) return { status: "too_big" };

  const token = cdnToken();
  if (!token) return { status: "not_configured" };

  const body = new FormData();
  body.append("file", file, file.name || "screenshot.png");

  try {
    const response = await fetch("https://cdn.hackclub.com/api/v4/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      console.error(`[cdn] upload returned ${response.status}`);
      return { status: "failed" };
    }

    const result = (await response.json()) as { url?: string };
    if (!result.url) {
      console.error("[cdn] upload succeeded but returned no url");
      return { status: "failed" };
    }

    return { status: "uploaded", url: result.url };
  } catch (error) {
    console.error("[cdn] upload failed", error);
    return { status: "failed" };
  }
}
