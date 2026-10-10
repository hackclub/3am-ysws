import type { RenderedEmail } from "./templates";

type SendEmailInput = {
  to: string;
  idempotencyKey: string;
  email: RenderedEmail;
};

/**
 * Best-effort transactional delivery. Email provider errors are deliberately
 * contained so notification outages cannot undo an already-saved 3AM action.
 */
export async function sendTransactionalEmail({ to, idempotencyKey, email }: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const recipient = to.trim();

  if (!apiKey || !from) {
    console.warn("[email] not sent: RESEND_API_KEY or EMAIL_FROM is not configured");
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    console.warn("[email] not sent: recipient address is invalid");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey.slice(0, 256),
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(process.env.EMAIL_REPLY_TO?.trim()
          ? { reply_to: process.env.EMAIL_REPLY_TO.trim() }
          : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      console.warn(`[email] Resend rejected a notification (HTTP ${response.status})`);
      return false;
    }
    return true;
  } catch {
    console.warn("[email] Resend request failed; the original 3AM action remains successful");
    return false;
  }
}

/** Builds links from the configured application origin, never from request headers. */
export function applicationUrl(path: string): string {
  const configured = process.env.APP_URL?.trim();
  if (!configured) throw new Error("APP_URL is not configured");
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Email URL path must be local");

  const base = new URL(configured);
  if (
    (base.protocol !== "https:" && base.protocol !== "http:") ||
    base.username ||
    base.password
  ) {
    throw new Error("APP_URL must be a valid http(s) origin");
  }
  if (base.protocol !== "https:" && base.hostname !== "localhost" && base.hostname !== "127.0.0.1") {
    throw new Error("APP_URL must use HTTPS outside localhost");
  }

  const url = new URL(path, base);
  if (url.origin !== base.origin) throw new Error("Email URL must stay on the application origin");
  return url.toString();
}
