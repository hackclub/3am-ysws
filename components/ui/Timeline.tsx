import type { ReactNode } from "react";

import styles from "./Timeline.module.css";

export type TimelineState = "done" | "now" | "pending";

export type TimelineStep = {
  title: ReactNode;
  meta?: ReactNode;
  state: TimelineState;
  tone?: "ok" | "warn" | "bad";
};

const TONE: Record<"ok" | "warn" | "bad", string | undefined> = {
  ok: undefined,
  warn: styles.warnMark,
  bad: styles.badMark,
};

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ul className={styles.list}>
      {steps.map((step, index) => (
        <li
          key={index}
          className={[styles.step, step.state === "pending" ? styles.pending : null]
            .filter(Boolean)
            .join(" ")}
        >
          <span
            className={[styles.mark, styles[step.state], step.tone ? TONE[step.tone] : null]
              .filter(Boolean)
              .join(" ")}
          />
          <span>
            <span className={styles.title}>{step.title}</span>
            {step.meta ? <span className={styles.meta}>{step.meta}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
