import Image from "next/image";
import type { ReactNode } from "react";

import { SiteNav } from "@/components/site/SiteNav";

import styles from "./Notice.module.css";

export function Notice({
  owl = "owl1",
  title,
  children,
  actions,
  reference,
}: {
  owl?: "owl" | "owl1" | "owl2";
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  reference?: string;
}) {
  return (
    <div className={styles.ground}>
      <SiteNav />
      <div className={styles.center}>
        <div className={styles.card}>
          <Image
            src={`/assets/${owl}.png`}
            alt=""
            width={60}
            height={60}
            className="pixel"
            unoptimized
          />
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.body}>{children}</p>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
          {reference ? <p className={styles.ref}>{reference}</p> : null}
        </div>
      </div>
    </div>
  );
}
