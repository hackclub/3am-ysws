import type { Metadata } from "next";

import { Notice } from "@/components/site/Notice";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "signed out" };

export default function GoodbyePage() {
  return (
    <Notice
      owl="owl1"
      title="see you at 3am"
      actions={<ButtonLink href="/api/auth/login">sign back in</ButtonLink>}
    >
      You are signed out. Your projects are safe, they will be here when you come back.
    </Notice>
  );
}
