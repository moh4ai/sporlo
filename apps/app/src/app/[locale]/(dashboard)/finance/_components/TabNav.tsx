"use client";

import { useTranslations } from "next-intl";

import { Tabs, type TabItem } from "@sporlo/ui";

import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { key: "overview", href: "/finance" },
  { key: "methods", href: "/finance/methods" },
  { key: "refunds", href: "/finance/refunds" },
  { key: "disclosures", href: "/finance/disclosures" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/finance") return pathname === "/finance";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabNav() {
  const t = useTranslations("finance.tabs");
  const pathname = usePathname();

  const items: TabItem[] = TABS.map((tab) => ({
    key: tab.key,
    label: t(tab.key),
    href: tab.href,
    active: isActive(pathname, tab.href),
  }));

  return (
    <Tabs
      ariaLabel="Finance tabs"
      items={items}
      renderLink={(item, className) => (
        <Link href={item.href} className={className}>
          {item.label}
        </Link>
      )}
    />
  );
}
