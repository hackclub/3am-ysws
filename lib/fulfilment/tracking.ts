// Courier tracking links and the tracking guide sent in dispatch DMs.
// Shared by the server (Slack messages) and the dashboard (track buttons).

export const DEFAULT_COURIER = "DTDC";

// DTDC's official tracking page. It serves both domestic (India) and international
// shipments from the same form. It cannot be pre-filled from the URL (the lookup is a
// captcha-protected form), so recipients paste the tracking ID themselves.
export const DTDC_TRACKING_URL = "https://www.dtdc.com/track-your-shipment/";

/** Official tracking page for a courier, or null when we do not know one. Blank means DTDC, our default. */
export function courierTrackingUrl(courier: string | null | undefined): string | null {
  const name = (courier ?? "").trim();
  if (!name || /\bdtdc\b/i.test(name)) return DTDC_TRACKING_URL;
  return null;
}

/** Slack mrkdwn lines walking the recipient through tracking their parcel. */
export function trackingGuideLines(tracking: string, courier: string | null | undefined, escape: (value: string) => string): string[] {
  // Backticks would break the code span the ID sits in.
  const id = escape(tracking.trim().replace(/`/g, ""));
  const url = courierTrackingUrl(courier);
  const name = (courier ?? "").trim() || DEFAULT_COURIER;
  if (url) {
    return [
      "*Track your parcel*",
      `1. Copy your tracking ID: \`${id}\``,
      `2. Open DTDC's official tracking page (works for India and international): <${url}|dtdc.com/track-your-shipment>`,
      "3. Paste the ID under *Shipment Number*, complete the check and press *Track*.",
    ];
  }
  return [
    "*Track your parcel*",
    `1. Copy your tracking ID: \`${id}\``,
    `2. Track it on ${escape(name)}'s official website.`,
  ];
}
