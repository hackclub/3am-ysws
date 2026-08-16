import type { ReviewBackend, ReviewSubmission, SubmitOutcome, WithdrawOutcome } from "./types";

export const localBackend: ReviewBackend = {
  name: "local",

  async submit(submission: ReviewSubmission): Promise<SubmitOutcome> {
    console.info(
      `[review] local backend queued ${submission.externalId} for ${submission.maker.email}`,
    );
    return { status: "queued" };
  },

  async withdraw(externalId: string): Promise<WithdrawOutcome> {
    console.info(`[review] local backend withdrew ${externalId}`);
    return { status: "withdrawn" };
  },
};
