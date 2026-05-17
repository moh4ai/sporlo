"use client";

import { useTranslations } from "next-intl";

import { Tabs, type TabItem } from "@sporlo/ui";

import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { key: "products", href: "/store" },
  { key: "orders", href: "/store/orders" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/store")
    return pathname === "/store" || /^\/store\/[^/]+$/.test(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabNav() {
  const t = useTranslations("store.tabs");
  const pathname = usePathname();

  const items: TabItem[] = TABS.map((tab) => ({
    key: tab.key,
    label: t(tab.key),
    href: tab.href,
    active: isActive(pathname, tab.href),
  }));

  return (
    <Tabs
      ariaLabel="Store tabs"
      items={items}
      renderLink={(item, className) => (
        <Link href={item.href} className={className}>
          {item.label}
        </Link>
      )}
    />
  );
}
