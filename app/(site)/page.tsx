import Image from "next/image";

import { Section } from "@/components/site/Section";
import { Faq } from "@/components/site/Faq";
import { Steps } from "@/components/site/Steps";
import { ButtonLink } from "@/components/ui/Button";

import styles from "./page.module.css";

export default function HomePage() {
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
