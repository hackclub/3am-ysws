import type { ReactNode } from "react";

import styles from "./Steps.module.css";

type Step = {
  title: string;
  body: ReactNode;
  note: string;
};

const STEPS: Step[] = [
  {
    title: "join the community",
    body: (
      <>
        Join{" "}
        <a
          href="https://hackclub.slack.com/app_redirect?channel=3am"
          target="_blank"
          rel="noreferrer"
        >
          #3am
        </a>{" "}
        in Slack.
      </>
    ),
    note: "come say hi, lurk silently, or accidentally make friends. your choice!",
  },
  {
    title: "build something",
    body: "Website, game, tool, app, whatever.",
    note: "the only requirement? it has to be dark.",
  },
  {
    title: "track your time",
    body: "Use Hackatime while you build.",
    note: "yes, we need proof you actually made the thing and didn't just stare at VS Code for 6 hours.",
  },
  {
    title: "send it in",
    body: "Submit it once it runs.",
    note: "show us what you built, how long it took, and hopefully something that actually works.",
  },
  {
    title: "get your prize",
    body: "Spend your beans on real stuff.",
    note: "sleep schedule not included.",
  },
];

export function Steps() {
  return (
    <ol className={styles.list}>
      {STEPS.map((step, index) => (
        <li key={step.title} className={styles.step}>
          <span className={styles.number} aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h2 className={styles.title}>{step.title}</h2>
            <p className={styles.body}>{step.body}</p>
            <span className={styles.note}>{step.note}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
