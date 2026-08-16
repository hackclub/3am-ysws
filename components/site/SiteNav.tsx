import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { SITE_NAV } from "@/lib/nav";

import styles from "./SiteNav.module.css";

export function SiteNav() {
  return (
    <header>
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand}>
          <Image
            src="/assets/owl.png"
            alt=""
            width={30}
            height={30}
            className="pixel"
            unoptimized
            priority
          />
          <span className={styles.wordmark}>3am</span>
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
