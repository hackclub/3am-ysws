export type NavItem = { href: string; label: string };

export const APP_NAV: NavItem[] = [
  { href: "/dash", label: "home" },
  { href: "/dash/projects", label: "projects" },
  { href: "/shop", label: "shop" },
  { href: "/dash/orders", label: "orders" },
  { href: "/dash/settings", label: "settings" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "overview" },
  { href: "/admin/ships", label: "submissions" },
];

export const SITE_NAV: NavItem[] = [
  { href: "/#how-it-works", label: "how it works" },
  { href: "/#rewards", label: "rewards" },
  { href: "/#faq", label: "faq" },
];

export function isActive(pathname: string, href: string) {
  if (href === "/dash" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
