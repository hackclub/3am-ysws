export const HACKATIME_STATE_COOKIE = "hackatime_state";

export const HACKATIME_SCOPES = "profile read";

export type HackatimeProfile = { id?: string | number; slack_id?: string };
export type HackatimeProject = { name: string; total_seconds: number };

function base(): string {
  return (process.env.HACKATIME_BASE_URL ?? "https://hackatime.hackclub.com").replace(/\/$/, "");
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function hackatimeRedirectUri(appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/api/hackatime/callback`;
}

export function hackatimeAuthorizeUrl(state: string, appUrl: string): string {
  const url = new URL(`${base()}/oauth/authorize`);
  url.searchParams.set("client_id", required("HACKATIME_CLIENT_ID"));
  url.searchParams.set("redirect_uri", hackatimeRedirectUri(appUrl));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", HACKATIME_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeHackatimeCode(code: string, appUrl: string): Promise<string> {
  const response = await fetch(`${base()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: required("HACKATIME_CLIENT_ID"),
      client_secret: required("HACKATIME_CLIENT_SECRET"),
      code,
      redirect_uri: hackatimeRedirectUri(appUrl),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`hackatime token exchange failed with ${response.status}`);
  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("hackatime token exchange returned no access token");
  return body.access_token;
}

async function get<T>(token: string, path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${base()}${path}`);
  for (const [name, value] of Object.entries(params ?? {})) url.searchParams.set(name, value);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`hackatime ${path} returned ${response.status}`);
  return (await response.json()) as T;
}

export function getHackatimeProfile(token: string): Promise<HackatimeProfile> {
  return get<HackatimeProfile>(token, "/api/v1/authenticated/me");
}

export function getHackatimeProjects(token: string): Promise<{ projects: HackatimeProject[] }> {
  return get<{ projects: HackatimeProject[] }>(token, "/api/v1/authenticated/projects");
}
