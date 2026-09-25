import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/site/SiteNav";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import styles from "./page.module.css";
export const metadata: Metadata = { title: "access suspended" };
export const dynamic = "force-dynamic";
export default async function BanPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=%2Fban");
  const [user] = await getDb().select({ email: users.email, reason: users.banReason }).from(users).where(eq(users.sub, session.sub)).limit(1);
  if (!user?.reason) redirect("/login");
  return <div className={styles.ground}><SiteNav /><main className={styles.center}><section className={styles.card} aria-labelledby="ban-title"><div className={styles.icon} aria-hidden="true">❌</div><p className={styles.kicker}>3AM · access suspended</p><h1 id="ban-title" className={styles.title}>you have been banned</h1><p className={styles.body}>Your access to 3AM has been suspended because of the following misconduct:</p><div className={styles.reason}><span className={styles.reasonLabel}>reason</span><p>{user.reason}</p></div><p className={styles.body}>If you believe this was made in error, or you need clarification, please reach out to <a href="mailto:hi@hridhaan.me">hi@hridhaan.me</a> or <a href="mailto:seba@hackclub.com">seba@hackclub.com</a>.</p><p className={styles.fine}>This restriction applies to this account and cannot be bypassed by creating another account.</p></section></main></div>;
}