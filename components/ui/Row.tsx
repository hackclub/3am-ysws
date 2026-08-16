import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";

import styles from "./Row.module.css";

export function Row({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={[styles.row, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

export function RowLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={[styles.row, className].filter(Boolean).join(" ")}>
      {children}
    </Link>
  );
}

export function RowText({ name, meta }: { name: ReactNode; meta?: ReactNode }) {
  return (
    <span className={styles.text}>
      <span className={styles.name}>{name}</span>
      {meta ? <span className={styles.meta}>{meta}</span> : null}
    </span>
  );
}
