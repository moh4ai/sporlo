"use client";

import { useTranslations } from "next-intl";

import { Tabs, type TabItem } from "@sporlo/ui";

import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { key: "pages", href: "/media" },
  { key: "news", href: "/media/news" },
  { key: "galleries", href: "/media/galleries" },
  { key: "broadcasts", href: "/media/broadcasts" },
  { key: "messages", href: "/media/messages" },
  { key: "prefs", href: "/media/prefs" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/media") return pathname === "/media";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabNav() {
  const t = useTranslations("media.tabs");
  const pathname = usePathname();

  const items: TabItem[] = TABS.map((tab) => ({
    key: tab.key,
    label: t(tab.key),
    href: tab.href,
    active: isActive(pathname, tab.href),
  }));

  return (
    <Tabs
      ariaLabel="Media tabs"
      items={items}
      renderLink={(item, className) => (
        <Link href={item.href} className={className}>
          {item.label}
        </Link>
      )}
    />
  );
}
