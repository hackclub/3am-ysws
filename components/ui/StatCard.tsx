import type { ReactNode } from "react";

import styles from "./StatCard.module.css";

type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
};

export function StatCard({ label, value, sub, accent = false }: StatCardProps) {
  return (
    <div className={[styles.card, accent ? styles.accent : null].filter(Boolean).join(" ")}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {sub ? <span className={styles.sub}>{sub}</span> : null}
    </div>
  );
}
