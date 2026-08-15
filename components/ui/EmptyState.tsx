import type { ReactNode } from "react";

import styles from "./EmptyState.module.css";

export function EmptyState({
  art,
  title,
  children,
  action,
}: {
  art?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={styles.empty}>
      {art ? <span className={styles.art}>{art}</span> : null}
      <p className={styles.title}>{title}</p>
      {children ? <p className={styles.body}>{children}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
