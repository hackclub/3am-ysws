export type ReviewSubmission = {
  externalId: string;
  title: string;
  description: string;
  repoUrl: string;
  demoUrl: string;
  thumbnailUrl: string;
  hackatimeProjects: string[];
  maker: { email: string; name: string; slackId: string };
  isUpdate?: boolean;
  updateMessage?: string;
};

export type SubmitOutcome =
  | { status: "queued" }
  | { status: "already_queued" }
  | { status: "rejected"; message: string; field?: string }
  | { status: "unavailable"; message: string };

export type WithdrawOutcome =
  { status: "withdrawn" } | { status: "not_queued" } | { status: "unavailable"; message: string };

export interface ReviewBackend {
  readonly name: "local" | "ari";
  submit(submission: ReviewSubmission): Promise<SubmitOutcome>;
  withdraw(externalId: string): Promise<WithdrawOutcome>;
}
