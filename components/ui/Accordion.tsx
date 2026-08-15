import type { ReactNode } from "react";

import styles from "./Accordion.module.css";

export function AccordionItem({
  question,
  children,
}: {
  question: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className={styles.item}>
      <summary className={styles.question}>
        {question}
        <span className={styles.chevron} aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className={styles.answer}>{children}</div>
    </details>
  );
}
