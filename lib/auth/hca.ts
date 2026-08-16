export const HCA_SCOPES = "openid profile email slack_id verification_status";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function hcaIssuer(): string {
  return (process.env.HCA_ISSUER ?? "https://auth.hackclub.com").replace(/\/$/, "");
}

export function appUrl(): string {
  return required("APP_URL").replace(/\/$/, "");
}

export function redirectUri(): string {
  return `${appUrl()}/api/auth/callback`;
}

export function clientId(): string {
  return required("HCA_CLIENT_ID");
}

export function clientSecret(): string {
  return required("HCA_CLIENT_SECRET");
}

export function authorizeUrl(state: string): string {
  const url = new URL(`${hcaIssuer()}/oauth/authorize`);
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", HCA_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

export type TokenResponse = {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
};

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const response = await fetch(`${hcaIssuer()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri(),
      code,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`token exchange failed with ${response.status}`);
  }

  return (await response.json()) as TokenResponse;
}
