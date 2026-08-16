import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/users";
import { getPickerProjects } from "@/lib/hackatime/projects";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  if (!user.hackatimeToken) {
    return NextResponse.json({ connected: false, projects: [] });
  }

  const projects = await getPickerProjects(user);
  if (!projects) return NextResponse.json({ connected: false, projects: [] });

  return NextResponse.json({ connected: true, projects });
}
