import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { isOrganizer } from "@/lib/auth/organizer";
import { getCurrentUser } from "@/lib/auth/users";
import { APP_NAV, ORGANIZER_NAV } from "@/lib/nav";
import type { NavItem } from "@/lib/nav";

import { NavLinks } from "./NavLinks";
import styles from "./AppShell.module.css";

export async function AppShell({
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
  const user = await getCurrentUser();
  const nav: NavItem[] = isOrganizer(user) ? [...APP_NAV, ...ORGANIZER_NAV] : APP_NAV;

  return (
    <>
      <div className={styles.shell}>
        <aside className={styles.side}>
          <Link href="/dash" className={styles.brand}>
            <Image
              src="/assets/owl.png"
              alt=""
              width={26}
              height={26}
              className="pixel"
              unoptimized
            />
            <span className={styles.wordmark}>3am</span>
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
