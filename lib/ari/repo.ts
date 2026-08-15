const TIMEOUT_MS = 5000;

export function githubSlug(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)github\.com$/i.test(parsed.hostname)) return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return `${parts[0]}/${parts[1].replace(/\.git$/i, "")}`;
  } catch {
    return null;
  }
}

export async function repoIsReachable(url: string): Promise<boolean | null> {
  const slug = githubSlug(url);
  const target = slug ? `https://github.com/${slug}` : url;

  try {
    const response = await fetch(target, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.status === 404 || response.status === 410) return false;
    if (response.ok) return true;
    return null;
  } catch {
    return null;
  }
}
