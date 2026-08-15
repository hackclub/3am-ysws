"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAV, isActive } from "@/lib/nav";
import type { NavItem } from "@/lib/nav";

import styles from "./NavLinks.module.css";

export function NavLinks({
  variant,
  items = APP_NAV,
}: {
  variant: "side" | "bar";
  items?: NavItem[];
}) {
  const pathname = usePathname() ?? "";

  return (
    <nav className={styles[variant]} aria-label={variant === "side" ? "sections" : undefined}>
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? styles.on : undefined}
            aria-current={active ? "page" : undefined}
          >
            <span className={styles.mark} aria-hidden="true">
              {active ? "◆" : "◇"}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
