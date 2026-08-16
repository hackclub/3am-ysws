export type NavItem = { href: string; label: string };

export const APP_NAV: NavItem[] = [
  { href: "/dash", label: "home" },
  { href: "/dash/projects", label: "projects" },
  { href: "/shop", label: "shop" },
  { href: "/dash/orders", label: "orders" },
  { href: "/dash/settings", label: "settings" },
];

export const ORGANIZER_NAV: NavItem[] = [
  { href: "/dash/ships", label: "submissions" },
  { href: "/dash/items", label: "shop items" },
  { href: "/dash/fulfilment", label: "fulfilment" },
  { href: "/dash/beans", label: "beans" },
  { href: "/dash/makers", label: "makers" },
];

export const SITE_NAV: NavItem[] = [
  { href: "/#how-it-works", label: "how it works" },
  { href: "/#rewards", label: "rewards" },
  { href: "/#faq", label: "faq" },
];

export function isActive(pathname: string, href: string) {
  if (href === "/dash") return pathname === "/dash";
  return pathname === href || pathname.startsWith(`${href}/`);
}
