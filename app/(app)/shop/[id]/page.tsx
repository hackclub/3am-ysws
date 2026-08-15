import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/Button";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { getCurrentUser } from "@/lib/auth/users";
import { balanceFor } from "@/lib/beans";
import { getDb } from "@/lib/db";
import { items } from "@/lib/db/schema";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "claim" };
export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fshop");

  const { id } = await params;
  const [item] = await getDb().select().from(items).where(eq(items.id, id)).limit(1);

  if (!item || item.hidden) notFound();

  const balance = await balanceFor(user.sub);
  const short = item.cost - balance;
  const soldOut = item.stock !== null && item.stock <= 0;
  const affordable = short <= 0;

  return (
    <AppShell title={item.name}>
      <div className={styles.split}>
        <Panel>
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" className={styles.image} />
          ) : (
            <span className={styles.blank} aria-hidden="true">
              🌙
            </span>
          )}
          {item.description ? <p className={styles.description}>{item.description}</p> : null}
        </Panel>

        <Panel>
          <PanelLabel>what it costs</PanelLabel>

          <div className={styles.sums}>
            <div className={styles.line}>
              <span>{item.name}</span>
              <span>{item.cost} beans</span>
            </div>
            <div className={styles.line}>
              <span>your balance</span>
              <span>{balance} beans</span>
            </div>
            <div
              className={[styles.line, styles.after, affordable ? null : styles.negative]
                .filter(Boolean)
                .join(" ")}
            >
              <span>balance after</span>
              <span>{balance - item.cost} beans</span>
            </div>
          </div>

          {soldOut ? (
            <Banner tone="warn" title="none left">
              This one is out of stock. More may come back later.
            </Banner>
          ) : affordable ? (
            <>
              <ButtonLink href={`/shop/${item.id}/checkout`}>claim it</ButtonLink>
              <p className={styles.note}>
                {item.stock !== null ? `${item.stock} left. ` : ""}Grants usually take two to three
                weeks to arrive.
              </p>
            </>
          ) : (
            <>
              <Banner tone="warn" title={`${short} beans short`}>
                That is {Math.ceil(short / 5)} more approved hours. Ship something else and come
                back.
              </Banner>
              <ButtonLink href="/dash/new" variant="quiet">
                send in a project
              </ButtonLink>
            </>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
