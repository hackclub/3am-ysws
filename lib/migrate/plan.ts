export type Submission = {
  id: string;
  createdTime: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  slackId: string | null;
  codeUrl: string | null;
  playableUrl: string | null;
  description: string | null;
  hackatimeUrl: string | null;
  overrideHours: number | null;
  rejected: boolean | null;
  rejectionReason: string | null;
  reviewerStatus: string[] | null;
  fulfilled: boolean | null;
  screenshotUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
};

export type ShopRow = {
  email: string | null;
  beans: number | null;
  manualAdd: number | null;
};

export type PendingOrder = {
  id: string;
  email: string | null;
  beans: number | null;
  details: string | null;
  submittedAt: string | null;
};

export type PlannedUser = {
  sub: string;
  email: string;
  name: string;
  slackId: string;
  fullName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
};

export type PlannedProject = {
  sourceId: string;
  slackId: string;
  title: string;
  description: string | null;
  repoUrl: string | null;
  demoUrl: string | null;
  screenshotUrl: string | null;
  hackatimeProjects: string[];
  submittedAt: string;
  decision: "approved" | "rejected" | null;
  approvedMinutes: number | null;
  noteToMaker: string | null;
  supersedes: string[];
};

export type PlannedBeans = { slackId: string; email: string; delta: number; raw: number };

export type PlannedOrder = {
  sourceId: string;
  slackId: string;
  itemName: string;
  cost: number;
};

export type Skip = { what: string; id: string; why: string };

export type Plan = {
  users: PlannedUser[];
  projects: PlannedProject[];
  beans: PlannedBeans[];
  orders: PlannedOrder[];
  skips: Skip[];
};

export function looksLikeSlackId(value: string | null): boolean {
  return /^[UW][A-Z0-9]{7,}$/.test(value?.trim().toUpperCase() ?? "");
}

export function normaliseRepo(url: string | null): string | null {
  if (!url) return null;
  return url
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
}

export function titleFromRepo(url: string | null, description: string | null): string {
  const repo = normaliseRepo(url);
  if (repo) {
    const segment = repo.split("/").filter(Boolean).pop();
    if (segment) {
      const words = segment.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
      if (words) return words;
    }
  }

  const fallback = description?.trim().split(/\s+/).slice(0, 6).join(" ");
  return fallback || "untitled project";
}

export function parseHackatimeProjects(url: string | null): string[] {
  if (!url) return [];
  const match = url.match(/\/project\/([^/?#]+)/i);
  if (!match) return [];
  const name = decodeURIComponent(match[1].replace(/\+/g, " ")).trim();
  return name ? [name] : [];
}

export function decisionFor(submission: Submission): {
  decision: "approved" | "rejected" | null;
  note: string | null;
} {
  const status = submission.reviewerStatus ?? [];
  const rejected =
    submission.rejected === true || status.includes("Reject") || status.includes("Fraud 100%");

  if (rejected) {
    return { decision: "rejected", note: submission.rejectionReason?.trim() || null };
  }

  if (status.includes("Approve") || submission.fulfilled === true) {
    return { decision: "approved", note: null };
  }

  return { decision: null, note: null };
}

export function roundBeans(value: number): number {
  return value < 0 ? -Math.round(Math.abs(value)) : Math.round(value);
}

export function parseOrderDetails(details: string | null): { itemName: string; cost: number }[] {
  if (!details) return [];
  return details
    .split("\n")
    .map((line) => line.replace(/^[•\-*]\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const beans = line.match(/(\d+)\s*beans/i);
      const name = line.replace(/\s*×\s*\d+.*$/, "").trim();
      return { itemName: name || line, cost: beans ? Number(beans[1]) : 0 };
    });
}

function displayName(submission: Submission): string {
  const joined = [submission.firstName, submission.lastName].filter(Boolean).join(" ").trim();
  return joined || submission.email || submission.slackId || "unknown maker";
}

export function buildPlan(
  submissions: Submission[],
  shop: ShopRow[],
  orders: PendingOrder[],
): Plan {
  const skips: Skip[] = [];

  const usable = submissions.filter((submission) => {
    if (!submission.slackId?.trim()) {
      skips.push({ what: "submission", id: submission.id, why: "no slack id, cannot pre-create" });
      return false;
    }
    if (!looksLikeSlackId(submission.slackId)) {
      skips.push({
        what: "submission",
        id: submission.id,
        why: `slack id is not one: "${submission.slackId.trim()}"`,
      });
      return false;
    }
    if (!submission.email?.trim()) {
      skips.push({ what: "submission", id: submission.id, why: "no email" });
      return false;
    }
    return true;
  });

  const newest = new Map<string, Submission[]>();
  for (const submission of usable) {
    const key = `${submission.slackId?.trim()}|${normaliseRepo(submission.codeUrl) ?? submission.id}`;
    newest.set(key, [...(newest.get(key) ?? []), submission]);
  }

  const projects: PlannedProject[] = [];
  for (const group of newest.values()) {
    const sorted = [...group].sort((a, b) => b.createdTime.localeCompare(a.createdTime));
    const [winner, ...older] = sorted;
    const { decision, note } = decisionFor(winner);

    projects.push({
      sourceId: winner.id,
      slackId: winner.slackId!.trim(),
      title: titleFromRepo(winner.codeUrl, winner.description),
      description: winner.description?.trim() || null,
      repoUrl: winner.codeUrl?.trim() || null,
      demoUrl: winner.playableUrl?.trim() || null,
      screenshotUrl: winner.screenshotUrl,
      hackatimeProjects: parseHackatimeProjects(winner.hackatimeUrl),
      submittedAt: winner.createdTime,
      decision,
      approvedMinutes:
        decision === "approved" ? Math.round((winner.overrideHours ?? 0) * 60) : null,
      noteToMaker: note,
      supersedes: older.map((entry) => entry.id),
    });
  }

  const bySlack = new Map<string, Submission>();
  for (const submission of usable) {
    const slackId = submission.slackId!.trim();
    const existing = bySlack.get(slackId);
    if (!existing || submission.createdTime > existing.createdTime)
      bySlack.set(slackId, submission);
  }

  const users: PlannedUser[] = [...bySlack.values()].map((submission) => ({
    sub: `airtable:${submission.id}`,
    email: submission.email!.trim().toLowerCase(),
    name: displayName(submission),
    slackId: submission.slackId!.trim(),
    fullName: displayName(submission),
    addressLine1: submission.addressLine1?.trim() || null,
    addressLine2: submission.addressLine2?.trim() || null,
    city: submission.city?.trim() || null,
    postcode: submission.postcode?.trim() || null,
    country: submission.country?.trim() || null,
  }));

  const slackByEmail = new Map<string, string>();
  for (const user of users) slackByEmail.set(user.email, user.slackId);

  const beans: PlannedBeans[] = [];
  for (const row of shop) {
    const email = row.email?.trim().toLowerCase();
    if (!email) continue;

    if ((row.manualAdd ?? 0) !== 0) {
      skips.push({ what: "beans", id: email, why: `test grant of ${row.manualAdd}` });
      continue;
    }

    const slackId = slackByEmail.get(email);
    if (!slackId) {
      skips.push({ what: "beans", id: email, why: "no matching maker" });
      continue;
    }

    const raw = row.beans ?? 0;
    const delta = roundBeans(raw);
    if (delta === 0) continue;
    beans.push({ slackId, email, delta, raw });
  }

  const plannedOrders: PlannedOrder[] = [];
  for (const order of orders) {
    const email = order.email?.trim().toLowerCase();
    const slackId = email ? slackByEmail.get(email) : undefined;
    if (!slackId) {
      skips.push({ what: "order", id: order.id, why: `no matching maker for ${email ?? "?"}` });
      continue;
    }

    const lines = parseOrderDetails(order.details);
    if (lines.length === 0) {
      skips.push({ what: "order", id: order.id, why: "no readable items" });
      continue;
    }

    for (const line of lines) {
      plannedOrders.push({
        sourceId: order.id,
        slackId,
        itemName: line.itemName,
        cost: line.cost,
      });
    }
  }

  return { users, projects, beans, orders: plannedOrders, skips };
}
