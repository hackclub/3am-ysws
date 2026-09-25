import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { requireOrganizer } from "@/lib/auth/organizer";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { BanUser } from "./BanUser";
export const metadata: Metadata={title:"ban a maker"}; export const dynamic="force-dynamic";
export default async function BanAdminPage(){if(!(await requireOrganizer()))notFound();const makers=await getDb().select({sub:users.sub,name:users.name,email:users.email,bannedAt:users.bannedAt,banReason:users.banReason}).from(users).orderBy(users.name);return <AppShell title="ban a maker"><BanUser makers={makers}/></AppShell>;}