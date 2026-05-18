"use client";

import { useTranslations } from "next-intl";

import { Tabs, type TabItem } from "@sporlo/ui";

import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { key: "fixtures", href: "/events" },
  { key: "hospitality", href: "/events/hospitality" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/events") {
    // Match exact /events and any /events/[uuid] detail/scan/report.
    return (
      pathname === "/events" ||
      (pathname.startsWith("/events/") && !pathname.startsWith("/events/hospitality"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabNav() {
  const t = useTranslations("events.tabs");
  const pathname = usePathname();

  const items: TabItem[] = TABS.map((tab) => ({
    key: tab.key,
    label: t(tab.key),
    href: tab.href,
    active: isActive(pathname, tab.href),
  }));

  return (
    <Tabs
      ariaLabel="Events tabs"
      items={items}
      renderLink={(item, className) => (
        <Link href={item.href} className={className}>
          {item.label}
        </Link>
      )}
    />
  );
}
