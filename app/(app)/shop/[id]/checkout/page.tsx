import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { getCurrentUser } from "@/lib/auth/users";
import { balanceFor } from "@/lib/beans";
import { getDb } from "@/lib/db";
import { items } from "@/lib/db/schema";

import { CheckoutForm } from "./CheckoutForm";
import styles from "../page.module.css";

export const metadata: Metadata = { title: "checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fshop");

  const { id } = await params;
  const [item] = await getDb().select().from(items).where(eq(items.id, id)).limit(1);
  if (!item || item.hidden) notFound();

  const balance = await balanceFor(user.sub);
  const soldOut = item.stock !== null && item.stock <= 0;
  if (soldOut || balance < item.cost) redirect(`/shop/${item.id}`);

  return (
    <AppShell title={`claim your ${item.name}`}>
      <div className={styles.split}>
        <Panel>
          <PanelLabel>where do we send it</PanelLabel>
          <CheckoutForm itemId={item.id} defaults={{ fullName: user.name, email: user.email }} />
        </Panel>

        <Panel>
          <PanelLabel>what happens</PanelLabel>
          <div className={styles.sums}>
            <div className={styles.line}>
              <span>{item.name}</span>
              <span>{item.cost} beans</span>
            </div>
            <div className={styles.line}>
              <span>balance now</span>
              <span>{balance} beans</span>
            </div>
            <div className={[styles.line, styles.after].join(" ")}>
              <span>balance after</span>
              <span>{balance - item.cost} beans</span>
            </div>
          </div>
          <p className={styles.note}>Grants usually take two to three weeks to arrive.</p>
        </Panel>
      </div>
    </AppShell>
  );
}
