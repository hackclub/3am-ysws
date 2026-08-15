import Link from "next/link";
import type { ReactNode } from "react";

import type { NavItem } from "@/lib/nav";

import { NavLinks } from "./NavLinks";
import styles from "./AppShell.module.css";

export function AppShell({
  title,
  action,
  aside,
  nav,
  home = "/dash",
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  aside?: ReactNode;
  nav?: NavItem[];
  home?: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className={styles.shell}>
        <aside className={styles.side}>
          <Link href={home} className={styles.wordmark}>
            3am
          </Link>
          <NavLinks variant="side" items={nav} />
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
        <NavLinks variant="bar" items={nav} />
      </div>
    </>
  );
}
