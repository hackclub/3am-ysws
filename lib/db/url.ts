const LIBPQ_ONLY = ["sslrootcert", "sslcert", "sslkey", "sslcrl", "sslcompression"];

export function connectionUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }

  for (const key of LIBPQ_ONLY) url.searchParams.delete(key);
  return url.toString();
}
