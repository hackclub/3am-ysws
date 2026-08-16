import type { HTMLAttributes, ReactNode } from "react";

import styles from "./Panel.module.css";

export function Panel({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={[styles.panel, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

export function PanelLabel({ children }: { children: ReactNode }) {
  return (
    <span className={styles.label}>
      <span className={styles.star} aria-hidden="true">
        ✦
      </span>
      {children}
    </span>
  );
}
