import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Notice } from "@/components/site/Notice";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/Button";
import { checkEligibility } from "@/lib/auth/eligibility";
import { hcaIssuer } from "@/lib/auth/hca";
import { getCurrentUser } from "@/lib/auth/users";

export const metadata: Metadata = { title: "verify" };
export const dynamic = "force-dynamic";

export default async function VerifyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fverify");

  const result = await checkEligibility({ slackId: user.slackId, email: user.email });

  if (result === "verified_eligible") {
    return (
      <Notice
        owl="owl"
        title="you are all set"
        actions={<ButtonLink href="/dash">go to your dashboard</ButtonLink>}
      >
        Hack Club has you verified, so you can ship whenever you are ready.
      </Notice>
    );
  }

  if (result === "verified_but_over_18") redirect("/ineligible?reason=age");
  if (result === "rejected") redirect("/ineligible?reason=review");

  const pending = result === "pending";

  return (
    <Notice
      owl="owl"
      title="one thing first"
      actions={
        <>
          {pending ? null : <ButtonLink href={hcaIssuer()}>verify with Hack Club</ButtonLink>}
          <ButtonLink href="/verify" variant="quiet">
            check again
          </ButtonLink>
        </>
      }
    >
      {pending
        ? "Your verification is with Hack Club now. Most come back within a week, and we will message you on Slack the moment it clears."
        : "Hack Club needs to verify who you are before you can ship. It takes a couple of minutes and you only ever do it once."}
    </Notice>
  );
}
