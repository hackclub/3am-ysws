import type { ReactNode } from "react";

import styles from "./Banner.module.css";

export type BannerTone = "info" | "ok" | "warn" | "bad";

const MARK: Record<BannerTone, string> = {
  info: "◆",
  ok: "✓",
  warn: "!",
  bad: "✕",
};

export function Banner({
  tone = "info",
  title,
  children,
}: {
  tone?: BannerTone;
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={[styles.banner, styles[tone]].join(" ")} role="status">
      <span aria-hidden="true">{MARK[tone]}</span>
      <span>
        {title ? <span className={styles.title}>{title}</span> : null}
        <span className={styles.body}>{children}</span>
      </span>
    </div>
  );
}
