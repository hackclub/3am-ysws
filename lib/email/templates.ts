/**
 * 3AM YSWS transactional email templates.
 * Server-side only. Keep copy and rendering separate from workflow logic.
 */

export interface ApprovedData {
  makerName: string;
  projectName: string;
  submissionUrl: string;
  nextSteps?: string;
}
export interface ChangesRequestedData {
  makerName: string;
  projectName: string;
  submissionUrl: string;
  reviewerMessage: string;
}
export interface PostedData {
  makerName: string;
  projectName: string;
  submissionUrl: string;
  publicUrl?: string;
}
export interface FulfilledData {
  makerName: string;
  projects: string[];
  approvedHours?: string;
  orderUrl?: string;
}
export interface RejectedData {
  makerName: string;
  projectName: string;
  rejectionReason: string;
  resubmitUrl: string;
}
export interface EmailTemplateMap {
  approved: ApprovedData;
  "changes-requested": ChangesRequestedData;
  posted: PostedData;
  fulfilled: FulfilledData;
  rejected: RejectedData;
}
export type EmailTemplateName = keyof EmailTemplateMap;
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}
export class EmailTemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailTemplateError";
  }
}

const COLORS = {
  night: "#0b1020",
  ink: "#1f2d3d",
  muted: "#8492a6",
  red: "#ec3750",
  green: "#33d6a6",
  orange: "#ff8c37",
  blue: "#338eda",
  purple: "#a633d6",
  grey: "#8492a6",
} as const;
const FONT = "Arial,Helvetica,sans-serif";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escapeMultiline(value: string): string {
  return escapeHtml(value.trim()).replace(/\r?\n/g, "<br>");
}
function requireText(value: string | undefined, field: string): string {
  const result = (value ?? "").trim();
  if (!result) throw new EmailTemplateError(`Missing required field: ${field}`);
  return result;
}
function safeUrl(value: string | undefined, field: string): string {
  const text = requireText(value, field);
  let parsed: URL;
  try { parsed = new URL(text); } catch { throw new EmailTemplateError(`Invalid URL in ${field}`); }
  if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || parsed.username || parsed.password) {
    throw new EmailTemplateError(`URL in ${field} must be a valid http(s) URL`);
  }
  return parsed.toString();
}
function p(html: string): string {
  return `<p style="margin:16px 0 0;font-size:16px;line-height:25px;color:${COLORS.ink};">${html}</p>`;
}
function button(label: string, href: string, color: string = COLORS.red): string {
  const url = escapeHtml(href);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px"><tr><td align="center" bgcolor="${color}" style="border-radius:10px"><a href="${url}" target="_blank" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:16px;font-weight:700;line-height:1;color:#fff;text-decoration:none;border-radius:10px">${escapeHtml(label)}</a></td></tr></table><p style="margin:8px 0 0;font-size:13px;line-height:20px;color:${COLORS.muted}">Button not working? Paste this link into your browser:<br><a href="${url}" style="color:${COLORS.muted};word-break:break-all">${url}</a></p>`;
}
function callout(label: string, innerHtml: string, color: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0"><tr><td style="border-left:4px solid ${color};background:#f6f7fb;border-radius:0 10px 10px 0;padding:16px 18px"><p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${color}">${escapeHtml(label)}</p><div style="margin:0;font-size:15px;line-height:23px;color:${COLORS.ink}">${innerHtml}</div></td></tr></table>`;
}
function projectCard(projectName: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;border:1px solid #e0e6ed;border-radius:10px"><tr><td style="padding:14px 18px"><p style="margin:0;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${COLORS.muted}">Project</p><p style="margin:4px 0 0;font-size:18px;font-weight:700;color:${COLORS.ink}">${escapeHtml(projectName)}</p></td></tr></table>`;
}
interface LayoutOptions {
  title: string;
  preheader: string;
  pill: string;
  pillColor: string;
  headline: string;
  body: string;
  footerReason?: string;
}
function layout(o: LayoutOptions): string {
  return `<!DOCTYPE html><html lang="en" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>${escapeHtml(o.title)}</title><style>body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%}a{color:${COLORS.red}}@media only screen and (max-width:620px){.container{width:100%!important}.px{padding-left:20px!important;padding-right:20px!important}.h1{font-size:24px!important;line-height:31px!important}}</style></head><body style="margin:0;padding:0;background:${COLORS.night}"><div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${escapeHtml(o.preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.night}" style="background:${COLORS.night}"><tr><td align="center" style="padding:32px 12px"><table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px"><tr><td class="px" style="padding:4px 32px 22px;font-family:${FONT}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:30px;font-weight:900;letter-spacing:-1px;color:#fff">&#9790;&nbsp;3AM</td><td align="right" style="font-size:13px;color:${COLORS.muted}">&#10022;&nbsp;&middot;&nbsp;&#10023;&nbsp;&middot;&nbsp;a Hack Club YSWS</td></tr></table></td></tr><tr><td bgcolor="#fff" style="background:#fff;border-radius:16px;border-top:6px solid ${o.pillColor}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="px" style="padding:32px 36px 36px;font-family:${FONT};color:${COLORS.ink}"><span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${o.pillColor};color:#fff;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">${escapeHtml(o.pill)}</span><h1 class="h1" style="margin:18px 0 0;font-size:28px;line-height:35px;font-weight:800;color:${COLORS.ink}">${o.headline}</h1>${o.body}<p style="margin:30px 0 0;font-size:16px;line-height:24px;color:${COLORS.ink}">Keep shipping,<br><strong>Team #3AM</strong></p></td></tr></table></td></tr><tr><td class="px" align="center" style="padding:24px 32px 8px;font-family:${FONT};font-size:13px;line-height:20px;color:${COLORS.muted}">Questions? DM us in <strong style="color:#c0ccda">#3AM</strong> on the Hack Club Slack.<br>${escapeHtml(o.footerReason ?? "You're getting this because you submitted a project to 3AM.")}<br><br>Hack Club, a 501(c)(3) nonprofit<br>212 Battery Street #3, Burlington, Vermont 05401</td></tr></table></td></tr></table></body></html>`;
}
const TEXT_FOOTER = `\n\nKeep shipping,\nTeam #3AM\n\nQuestions? DM us in #3AM on the Hack Club Slack.\nYou're getting this because you submitted a project to 3AM.\nHack Club, a 501(c)(3) nonprofit\n212 Battery Street #3, Burlington, Vermont 05401`;

export function renderApproved(d: ApprovedData): RenderedEmail {
  const maker = requireText(d.makerName, "makerName");
  const project = requireText(d.projectName, "projectName");
  const url = safeUrl(d.submissionUrl, "submissionUrl");
  const next = d.nextSteps?.trim();
  const html = layout({ title: "Your 3AM project was approved", preheader: `${project} passed review. Nice work.`, pill: "Approved", pillColor: COLORS.green, headline: `${escapeHtml(project)} is approved!`, body: p(`Hey ${escapeHtml(maker)},`) + p("A reviewer looked over your project and it passed. You shipped something real, and that counts.") + projectCard(project) + (next ? callout("What happens next", escapeMultiline(next), COLORS.green) : "") + button("View your submission", url) });
  return { subject: `✅ ${project} is approved`, html, text: `Hey ${maker},\n\nA reviewer looked over your project and it passed. You shipped something real, and that counts.\n\nProject: ${project}${next ? `\n\nWhat happens next:\n${next}` : ""}\n\nView your submission: ${url}${TEXT_FOOTER}` };
}
export function renderChangesRequested(d: ChangesRequestedData): RenderedEmail {
  const maker = requireText(d.makerName, "makerName");
  const project = requireText(d.projectName, "projectName");
  const url = safeUrl(d.submissionUrl, "submissionUrl");
  const message = requireText(d.reviewerMessage, "reviewerMessage");
  const html = layout({ title: "Changes requested on your 3AM project", preheader: `A reviewer left feedback on ${project}.`, pill: "Changes requested", pillColor: COLORS.orange, headline: "Almost there: a few changes needed", body: p(`Hey ${escapeHtml(maker)},`) + p(`A reviewer checked <strong>${escapeHtml(project)}</strong> and needs a few things fixed before it can be approved. Here's what they said:`) + callout("Reviewer feedback", escapeMultiline(message), COLORS.orange) + p("Make the changes, then update your submission so it goes back into review.") + button("Update your submission", url, COLORS.orange) });
  return { subject: `Changes requested on ${project}`, html, text: `Hey ${maker},\n\nA reviewer checked "${project}" and needs a few things fixed before it can be approved. Here's what they said:\n\n${message}\n\nMake the changes, then update your submission so it goes back into review.\n\nUpdate your submission: ${url}${TEXT_FOOTER}` };
}
export function renderPosted(d: PostedData): RenderedEmail {
  const maker = requireText(d.makerName, "makerName");
  const project = requireText(d.projectName, "projectName");
  const submissionUrl = safeUrl(d.submissionUrl, "submissionUrl");
  const publicUrl = d.publicUrl?.trim() ? safeUrl(d.publicUrl, "publicUrl") : undefined;
  const html = layout({ title: "Your 3AM project is live", preheader: `${project} has been posted.`, pill: "Posted", pillColor: COLORS.blue, headline: `${escapeHtml(project)} is live!`, body: p(`Hey ${escapeHtml(maker)},`) + p("Your project has been posted. Go show it off.") + projectCard(project) + (publicUrl ? button("See it live", publicUrl, COLORS.blue) : button("View your submission", submissionUrl, COLORS.blue)) });
  return { subject: `🚀 ${project} is live`, html, text: `Hey ${maker},\n\nYour project has been posted. Go show it off.\n\nProject: ${project}\n${publicUrl ? `See it live: ${publicUrl}` : `View your submission: ${submissionUrl}`}${TEXT_FOOTER}` };
}
export function renderFulfilled(d: FulfilledData): RenderedEmail {
  const maker = requireText(d.makerName, "makerName");
  const projects = (d.projects ?? []).map((x) => x.trim()).filter(Boolean);
  if (!projects.length) throw new EmailTemplateError("Missing required field: projects");
  const hours = d.approvedHours?.trim();
  const orderUrl = d.orderUrl?.trim() ? safeUrl(d.orderUrl, "orderUrl") : undefined;
  const listHtml = projects.map((x) => `&bull;&nbsp;${escapeHtml(x)}`).join("<br>");
  const html = layout({ title: "Your 3AM reward has been fulfilled", preheader: `Fulfilment is complete for ${projects.length} item${projects.length === 1 ? "" : "s"}.`, pill: "Fulfilled", pillColor: COLORS.purple, headline: "Your reward has been fulfilled", footerReason: "You're getting this because an order on your 3AM account was marked fulfilled.", body: p(`Hey ${escapeHtml(maker)},`) + p("We've marked fulfilment for your order as complete. Here's what this covers:") + callout("Covered by this reward", listHtml, COLORS.purple) + (hours ? p(`Approved hours: <strong>${escapeHtml(hours)}</strong>`) : "") + (orderUrl ? button("View your order", orderUrl, COLORS.purple) : "") });
  return { subject: "🎁 Your 3AM reward has been fulfilled", html, text: `Hey ${maker},\n\nWe've marked fulfilment for your order as complete. Here's what this covers:\n\n${projects.map((x) => `- ${x}`).join("\n")}${hours ? `\n\nApproved hours: ${hours}` : ""}${orderUrl ? `\n\nView your order: ${orderUrl}` : ""}${TEXT_FOOTER.replace("You're getting this because you submitted a project to 3AM.", "You're getting this because an order on your 3AM account was marked fulfilled.")}` };
}
export function renderRejected(d: RejectedData): RenderedEmail {
  const maker = requireText(d.makerName, "makerName");
  const project = requireText(d.projectName, "projectName");
  const reason = requireText(d.rejectionReason, "rejectionReason");
  const url = safeUrl(d.resubmitUrl, "resubmitUrl");
  const html = layout({ title: "Update on your 3AM project", preheader: `Review result for ${project}.`, pill: "Not approved", pillColor: COLORS.grey, headline: `${escapeHtml(project)} wasn't approved this time`, body: p(`Hey ${escapeHtml(maker)},`) + p("Thanks for shipping. A reviewer checked your project and couldn't approve it. Here's why:") + callout("Reason", escapeMultiline(reason), COLORS.grey) + p("Depending on the reason, you can fix it and resubmit. If something seems off, DM us in #3AM and we'll take a look.") + button("Resubmit your project", url) });
  return { subject: `Update on ${project}`, html, text: `Hey ${maker},\n\nThanks for shipping. A reviewer checked "${project}" and couldn't approve it. Here's why:\n\n${reason}\n\nDepending on the reason, you can fix it and resubmit. If something seems off, DM us in #3AM and we'll take a look.\n\nResubmit your project: ${url}${TEXT_FOOTER}` };
}
const renderers: { [K in EmailTemplateName]: (data: EmailTemplateMap[K]) => RenderedEmail } = {
  approved: renderApproved,
  "changes-requested": renderChangesRequested,
  posted: renderPosted,
  fulfilled: renderFulfilled,
  rejected: renderRejected,
};
export function renderEmail<K extends EmailTemplateName>(name: K, data: EmailTemplateMap[K]): RenderedEmail {
  return renderers[name](data);
}
