import type { Metadata } from "next";

import { Notice } from "@/components/site/Notice";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "not this time" };

const SLACK = "https://hackclub.slack.com/app_redirect?channel=3am";

const COPY: Record<string, string> = {
  age: "3am is for people aged 13 to 18, and Hack Club has you outside that. Nothing you can do about that one, sorry.",
  review:
    "Hack Club could not verify your account, so you cannot ship here for now. If you think that is wrong, they are the ones who can look at it again.",
};

const FALLBACK =
  "Your Hack Club account is not eligible for 3am right now, so you cannot ship projects here.";

export default async function IneligiblePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <Notice
      owl="owl1"
      title="not this time"
      actions={
        <>
          <ButtonLink href={SLACK}>hang out in #3am</ButtonLink>
          <ButtonLink href="/" variant="quiet">
            back home
          </ButtonLink>
        </>
      }
    >
      {(reason && COPY[reason]) ?? FALLBACK}
    </Notice>
  );
}
