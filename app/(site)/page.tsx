import Image from "next/image";
import { sql } from "drizzle-orm";

import { Section } from "@/components/site/Section";
import { Faq } from "@/components/site/Faq";
import { Steps } from "@/components/site/Steps";
import { ButtonLink } from "@/components/ui/Button";
import { getDb } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";

import styles from "./page.module.css";

export default async function HomePage() {
  const db = getDb();
  const [makerStats, projectStats, approvedStats] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(projects),
    db
      .select({
        count: sql<number>`count(*)`,
        minutes: sql<number>`coalesce(sum(${projects.approvedMinutes}), 0)`,
      })
      .from(projects)
      .where(sql`${projects.decision} = 'approved'`),
  ]);

  const stats = {
    makers: Number(makerStats[0]?.count ?? 0),
    projects: Number(projectStats[0]?.count ?? 0),
    approvedProjects: Number(approvedStats[0]?.count ?? 0),
    hours: Math.floor(Number(approvedStats[0]?.minutes ?? 0) / 60),
  };

  return (
    <>
      <section className={styles.hero}>
        <h1 className={styles.wordmark}>3am</h1>
        <p className={styles.credit}>YSWS by SEBA, Hack Club</p>

        <p className={styles.lead}>
          Pick something dark themed to build. A moody website, a cursed little tool, a game, or
          whatever else you can come up with.
        </p>
        <p className={styles.lead}>
          The only rule? It should look like it was built after the sun went down.
        </p>

        <div className={styles.owlRow}>
          <Image
            src="/assets/owl.png"
            alt=""
            width={52}
            height={52}
            className="pixel"
            unoptimized
            priority
          />
          <p className={styles.lead}>
            Finish it, ship it, and get rewarded for the hours you put in.
          </p>
        </div>

        <div className={styles.actions}>
          <ButtonLink href="/login">start building</ButtonLink>
          <ButtonLink href="/#how-it-works" variant="ghost">
            how it works
          </ButtonLink>
        </div>

        <div className={styles.stats} aria-label="3am stats">
          <div className={styles.stat}>
            <strong>{stats.makers.toLocaleString()}</strong>
            <span>makers</span>
          </div>
          <div className={styles.stat}>
            <strong>{stats.projects.toLocaleString()}</strong>
            <span>projects</span>
          </div>
          <div className={styles.stat}>
            <strong>{stats.approvedProjects.toLocaleString()}</strong>
            <span>approved</span>
          </div>
          <div className={styles.stat}>
            <strong>{stats.hours.toLocaleString()}h</strong>
            <span>hours approved</span>
          </div>
        </div>

        <div className={styles.policyNotice} role="note">
          <span className={styles.policyTitle}>0% tolerance for AI slop</span>
          <span className={styles.policyText}>
            Submit work you built yourself. Submitting low-effort or AI-generated work may result in
            removal from 3am and a ban from participating.
          </span>
        </div>

        <span className={styles.note}>made possible by questionable sleep schedules</span>
      </section>

      <Section id="how-it-works" label="how it works">
        <Steps />
      </Section>

      <Section id="faq" label="questions">
        <Faq />
      </Section>
    </>
  );
}
