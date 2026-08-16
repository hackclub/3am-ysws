import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { requireOrganizer } from "@/lib/auth/organizer";
import { getDb } from "@/lib/db";
import { items } from "@/lib/db/schema";

import { ItemsAdmin } from "./ItemsAdmin";

export const metadata: Metadata = { title: "shop items" };
export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  if (!(await requireOrganizer())) notFound();

  const rows = await getDb().select().from(items).orderBy(asc(items.position), asc(items.name));

  return (
    <AppShell title="shop items">
      <ItemsAdmin items={rows} />
    </AppShell>
  );
}
