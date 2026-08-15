import type { ReactNode } from "react";

import { SiteNav } from "@/components/site/SiteNav";

import styles from "./layout.module.css";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.ground}>
      <SiteNav />
      {children}
    </div>
  );
}
