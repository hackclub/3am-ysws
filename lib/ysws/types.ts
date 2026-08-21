export type PendingRow = {
  projectId: string;
  title: string;
  description: string | null;
  repoUrl: string | null;
  demoUrl: string | null;
  thumbnailUrl: string | null;
  hackatimeProjects: string[];
  approvedMinutes: number | null;
  noteToMaker: string | null;
  decidedAt: Date | null;

  email: string;
  firstName: string | null;
  lastName: string | null;
  birthday: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postcode: string | null;
  country: string | null;

  recordId: string | null;
  firstSubmittedAt: Date | null;
  overrideMinutes: number | null;
  hoursJustification: string | null;
  ageJustification: string | null;
  duplicateJustification: string | null;

  commits: number | null;
  sharedCodeUrl: boolean;
};

export type GateProblem = { field: string; message: string };

export type UnifiedState = "held" | "queued" | "sent" | "error";

export type ApprovedRow = {
  projectId: string;
  title: string;
  maker: string;
  email: string;
  decidedAt: Date | null;
  approvedMinutes: number | null;
  overrideMinutes: number | null;
  state: UnifiedState | null;
  recordId: string | null;
  error: string | null;
  ageJustification: string | null;
  duplicateJustification: string | null;
  missing: string[];
};
