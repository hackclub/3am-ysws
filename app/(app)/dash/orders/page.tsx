import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { OrderStatusWord } from "@/components/ui/StatusWord";
import { getCurrentUser } from "@/lib/auth/users";
import { balanceFor } from "@/lib/beans";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { orderStatusOf } from "@/lib/projects/status";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "your orders" };
export const dynamic = "force-dynamic";

const WHEN = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fdash%2Forders");

  const [balance, mine] = await Promise.all([
    balanceFor(user.sub),
    getDb()
      .select()
      .from(orders)
      .where(eq(orders.userSub, user.sub))
      .orderBy(desc(orders.createdAt)),
  ]);

  return (
    <AppShell
      title="your orders"
      action={
        <span className={styles.balance}>
          <Image
            src="/assets/beans.png"
            alt=""
            width={20}
            height={20}
            className="pixel"
            unoptimized
          />
          {balance} beans
        </span>
      }
    >
      {mine.length === 0 ? (
        <EmptyState
          title="nothing claimed yet"
          action={<ButtonLink href="/shop">go to the shop</ButtonLink>}
        >
          Approved hours turn into beans, and beans turn into real things.
        </EmptyState>
      ) : (
        <Panel>
          <PanelLabel>everything you have claimed</PanelLabel>
          <div className={styles.wrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>item</th>
                  <th>cost</th>
                  <th>claimed</th>
                  <th>where it is</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span className={styles.name}>{order.itemName}</span>
                      {order.city ? (
                        <span className={styles.where}>
                          {order.city}
                          {order.country ? `, ${order.country}` : ""}
                        </span>
                      ) : null}
                    </td>
                    <td>{order.cost}</td>
                    <td>{WHEN.format(order.createdAt)}</td>
                    <td>
                      <OrderStatusWord status={orderStatusOf(order.status)} size="s" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </AppShell>
  );
}
