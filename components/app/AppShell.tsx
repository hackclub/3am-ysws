import Link from "next/link";
import type { ReactNode } from "react";

import { NavLinks } from "./NavLinks";
import styles from "./AppShell.module.css";

export function AppShell({
  title,
  action,
  aside,
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className={styles.shell}>
        <aside className={styles.side}>
          <Link href="/dash" className={styles.wordmark}>
            3am
          </Link>
          <NavLinks variant="side" />
          {aside ? <div className={styles.sideFoot}>{aside}</div> : null}
        </aside>
        <main className={styles.main}>
          <div className={styles.top}>
            <h1 className={styles.title}>{title}</h1>
            {action}
          </div>
          {children}
        </main>
      </div>
      <div className={styles.bar}>
        <NavLinks variant="bar" />
      </div>
    </>
  );
}
