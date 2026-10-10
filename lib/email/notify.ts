import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { Project } from "@/lib/db/schema";

import { applicationUrl, sendTransactionalEmail } from "./send";
import { renderEmail } from "./templates";

/** Notify after any successful decision path, including external review webhooks. */
export async function notifyProjectDecision(project: Project): Promise<void> {
  try {
    if (!project.decision || project.decision === "withdrawn") return;

    const [maker] = await getDb()
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.sub, project.userSub))
      .limit(1);
    if (!maker?.email) return;

    const submissionUrl = applicationUrl("/dash/projects");
    const eventTime = project.decidedAt?.getTime() ?? Date.now();
    const email =
      project.decision === "approved"
        ? renderEmail("approved", {
            makerName: maker.name,
            projectName: project.title,
            submissionUrl,
            nextSteps:
              project.approvedMinutes == null
                ? undefined
                : `Approved time: ${(project.approvedMinutes / 60).toFixed(2)} hours.`,
          })
        : project.decision === "changes"
          ? renderEmail("changes-requested", {
              makerName: maker.name,
              projectName: project.title,
              submissionUrl,
              reviewerMessage: project.noteToMaker ?? "",
            })
          : renderEmail("rejected", {
              makerName: maker.name,
              projectName: project.title,
              rejectionReason: project.noteToMaker ?? "",
              resubmitUrl: submissionUrl,
            });

    await sendTransactionalEmail({
      to: maker.email,
      idempotencyKey: `3am-project-${project.decision}-${project.id}-${eventTime}`,
      email,
    });
  } catch {
    // Email is an optional side effect; never turn a saved review decision into a failure.
    console.warn("[email] could not prepare project decision notification; decision was saved");
  }
}
