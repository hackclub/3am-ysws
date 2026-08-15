import type { ReactNode } from "react";

/**
 * The public site: home, rules, faq, the error pages.
 * Gets the marketing chrome (SiteNav and Footer) once those land.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
