import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCurrentUser } from "@/lib/auth/users";
import { balanceFor } from "@/lib/beans";
import { getDb } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { BEANS_PER_HOUR } from "@/lib/rewards";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "shop" };
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fshop");

  const [balance, rows] = await Promise.all([
    balanceFor(user.sub),
    getDb()
      .select()
      .from(items)
      .where(eq(items.hidden, false))
      .orderBy(asc(items.position), asc(items.name)),
  ]);

  const beans = (
    <Image src="/assets/beans.png" alt="" width={20} height={20} className="pixel" unoptimized />
  );

  return (
    <AppShell
      title="shop"
      action={
        <span className={styles.balance}>
          {beans}
          {balance} beans
        </span>
      }
    >
      <Banner tone="info" title={`every approved hour is ${BEANS_PER_HOUR} beans`}>
        Grants are cool!
      </Banner>

      {rows.length === 0 ? (
        <EmptyState title="nothing in the shop yet">
          Someone has to put things in it first. Check back soon.
        </EmptyState>
      ) : (
        <div className={styles.grid}>
          {rows.map((item) => {
            const soldOut = item.stock !== null && item.stock <= 0;
            const short = item.cost - balance;
            const affordable = short <= 0;

            return (
              <div
                key={item.id}
                className={[styles.card, affordable && !soldOut ? null : styles.short]
                  .filter(Boolean)
                  .join(" ")}
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className={styles.thumb} />
                ) : (
                  <span className={styles.blank} aria-hidden="true">
                    🌙
                  </span>
                )}
                <span className={styles.name}>{item.name}</span>
                {item.description ? (
                  <span className={styles.description}>{item.description}</span>
                ) : null}
                <span className={styles.price}>
                  {beans}
                  {item.cost}
                  {item.stock !== null ? (
                    <span className={soldOut ? styles.gone : styles.stock}>
                      {soldOut ? "none left" : `${item.stock} left`}
                    </span>
                  ) : null}
                </span>
                {soldOut ? (
                  <ButtonLink href="/shop" variant="quiet" aria-disabled="true">
                    none left
                  </ButtonLink>
                ) : affordable ? (
                  <ButtonLink href={`/shop/${item.id}`} variant="quiet">
                    claim it
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/dash" variant="quiet" aria-disabled="true">
                    {short} beans short
                  </ButtonLink>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
