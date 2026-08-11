import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { fetchUserData } from "@/lib/airtable";
import ShopClient from "./ShopClient";

export default async function ShopPage() {
  const session = await getSession();

  if (!session) {
    redirect("/api/auth/login");
  }

  const userData = await fetchUserData(session.email);

  return (
    <ShopClient
      user={session}
      balance={{
        approvedHours: userData.approvedHours,
        coffeeBeans: userData.coffeeBeans,
      }}
      projects={userData.projects || []}
    />
  );
}
