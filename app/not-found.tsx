import type { Metadata } from "next";

import { Notice } from "@/components/site/Notice";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "nothing here" };

export default function NotFound() {
  return (
    <Notice owl="owl1" title="nothing here" actions={<ButtonLink href="/">back home</ButtonLink>}>
      That page does not exist, or it did once and does not now.
    </Notice>
  );
}
