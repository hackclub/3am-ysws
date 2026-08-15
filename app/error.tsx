"use client";

import { Notice } from "@/components/site/Notice";
import { Button, ButtonLink } from "@/components/ui/Button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Notice
      owl="owl2"
      title="that broke"
      reference={error.digest ? `reference ${error.digest}` : undefined}
      actions={
        <>
          <Button onClick={reset}>try again</Button>
          <ButtonLink href="/" variant="quiet">
            back home
          </ButtonLink>
        </>
      }
    >
      Something on our side fell over. We know about it. Trying again usually works.
    </Notice>
  );
}
