"use client";

import { useTranslations } from "next-intl";

import { Tabs, type TabItem } from "@sporlo/ui";

import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { key: "plans", href: "/memberships" },
  { key: "members", href: "/memberships/members" },
  { key: "subscriptions", href: "/memberships/subscriptions" },
  { key: "coupons", href: "/memberships/coupons" },
  { key: "revenue", href: "/memberships/revenue" },
] as const;

export type MembershipsTab = (typeof TABS)[number]["key"];

function isActive(pathname: string, href: string): boolean {
  if (href === "/memberships") return pathname === "/memberships";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabNav() {
  const t = useTranslations("memberships.tabs");
  const pathname = usePathname();

  const items: TabItem[] = TABS.map((tab) => ({
    key: tab.key,
    label: t(tab.key),
    href: tab.href,
    active: isActive(pathname, tab.href),
  }));

  return (
    <Tabs
      ariaLabel="Memberships tabs"
      items={items}
      renderLink={(item, className) => (
        <Link href={item.href} className={className}>
          {item.label}
        </Link>
      )}
    />
  );
}
