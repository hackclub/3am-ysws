import type { ReactNode } from "react";

/**
 * Everything behind a sign in. Gets the AppShell (sidebar, top bar,
 * mobile bottom bar) once it lands, and the session guard in group D.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
