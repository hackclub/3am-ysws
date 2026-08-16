import type { ReactNode } from "react";

import styles from "./Section.module.css";

export function Section({
  id,
  label,
  children,
}: {
  id?: string;
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className={styles.section}>
      <span className={styles.label}>✦ {label}</span>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
