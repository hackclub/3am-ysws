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

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function repoHasReadme(url: string): Promise<boolean | null> {
  const slug = githubSlug(url);
  if (!slug) return null;

  try {
    const response = await fetch(`https://api.github.com/repos/${slug}/readme`, {
      headers: githubHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.status === 404) return false;
    if (response.ok) return true;

    console.error(`[repo] github readme lookup returned ${response.status} for ${slug}`);
    return null;
  } catch (error) {
    console.error("[repo] github readme lookup failed", error);
    return null;
  }
}

export async function repoCommitCount(url: string, cap = 2): Promise<number | null> {
  const slug = githubSlug(url);
  if (!slug) return null;

  try {
    const response = await fetch(`https://api.github.com/repos/${slug}/commits?per_page=${cap}`, {
      headers: githubHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.status === 404 || response.status === 409) return 0;
    if (!response.ok) {
      console.error(`[repo] github commit lookup returned ${response.status} for ${slug}`);
      return null;
    }

    const commits = (await response.json()) as unknown[];
    return Array.isArray(commits) ? commits.length : null;
  } catch (error) {
    console.error("[repo] github commit lookup failed", error);
    return null;
  }
}
