import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { SiteNav } from "@/components/site/SiteNav";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/Button";
import { safeReturnTo } from "@/lib/auth/oauth-state";
import { getSession } from "@/lib/auth/session";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "sign in" };

const REASONS: Record<string, string> = {
  denied: "You said no to the permissions, so nothing happened. Nothing was shared.",
  missing_email: "Your Hack Club account has no email on it, so we cannot match your hours.",
  missing_slack_id:
    "Your Hack Club account is not linked to Slack yet. Link it, then come back here.",
};

const FALLBACK = "That sign in did not go through. Give it another go.";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const returnTo = safeReturnTo(next);

  if (await getSession()) redirect(returnTo ?? "/dash");

  const href = returnTo
    ? `/api/auth/login?next=${encodeURIComponent(returnTo)}`
    : "/api/auth/login";

  return (
    <div className={styles.ground}>
      <SiteNav />
      <div className={styles.center}>
        <div className={styles.card}>
          <Image
            src="/assets/owl.png"
            alt=""
            width={60}
            height={60}
            className="pixel"
            unoptimized
          />
          <h1 className={styles.title}>let us in, night owl</h1>
          <p className={styles.body}>
            You sign in with your Hack Club account. It is how we know your hours are yours, and
            where to send your beans.
          </p>
          {error ? (
            <div className={styles.full}>
              <Banner tone={error === "denied" ? "warn" : "bad"}>
                {REASONS[error] ?? FALLBACK}
              </Banner>
            </div>
          ) : null}
          <ButtonLink href={href} className={styles.full}>
            continue with Hack Club
          </ButtonLink>
          <p className={styles.fine}>We only ask for your name, email and Slack handle.</p>
        </div>
      </div>
    </div>
  );
}
