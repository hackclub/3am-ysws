import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { SITE_NAV } from "@/lib/nav";

import styles from "./SiteNav.module.css";

export function SiteNav() {
  return (
    <header>
      <nav className={styles.nav}>
        <Link href="/" className={styles.wordmark}>
          3am
        </Link>
        <span className={styles.links}>
          {SITE_NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <ButtonLink href="/login" variant="quiet">
            sign in
          </ButtonLink>
        </span>
      </nav>
    </header>
  );
}
