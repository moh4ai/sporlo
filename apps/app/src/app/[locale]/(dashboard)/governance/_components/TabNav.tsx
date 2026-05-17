"use client";

import { useTranslations } from "next-intl";

import { Tabs, type TabItem } from "@sporlo/ui";

import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { key: "scores", href: "/governance" },
  { key: "deadlines", href: "/governance/deadlines" },
  { key: "events", href: "/governance/events" },
  { key: "appeals", href: "/governance/appeals" },
  { key: "reports", href: "/governance/reports" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/governance") return pathname === "/governance";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabNav() {
  const t = useTranslations("governance.tabs");
  const pathname = usePathname();

  const items: TabItem[] = TABS.map((tab) => ({
    key: tab.key,
    label: t(tab.key),
    href: tab.href,
    active: isActive(pathname, tab.href),
  }));

  return (
    <Tabs
      ariaLabel="Governance tabs"
      items={items}
      renderLink={(item, className) => (
        <Link href={item.href} className={className}>
          {item.label}
        </Link>
      )}
    />
  );
}
