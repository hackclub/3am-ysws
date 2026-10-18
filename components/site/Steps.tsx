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
    title: "build something spooky",
    body: "Make a dark-themed hardware or software project: a website, game, tool, app, physical build, or electronics project.",
    note: "pick Hardware or Software when you submit. spooky vibes encouraged; originality required.",
  },
  {
    title: "track your time",
    body: "Use Hackatime while you build.",
    note: "give your first session a few minutes to appear, and make sure it is attached to the right project.",
  },
  {
    title: "send it in",
    body: "Submit it once it runs.",
    note: "include a public repo, a working demo or downloadable build, a still screenshot, and the correct Hackatime share link.",
  },
  {
    title: "get your prize",
    body: "Spend your beans on rewards in the #3AM Shop.",
    note: "ship real work, don't double-dip, and keep the spooky season fun.",
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
