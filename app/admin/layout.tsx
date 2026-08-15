import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { isOrganizer } from "@/lib/auth/organizer";
import { getCurrentUser } from "@/lib/auth/users";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fadmin");
  if (!isOrganizer(user)) notFound();

  return <>{children}</>;
}
