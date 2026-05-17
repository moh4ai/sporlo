"use client";

import { useTranslations } from "next-intl";

import { Tabs, type TabItem } from "@sporlo/ui";

import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { key: "directory", href: "/hr" },
  { key: "orgChart", href: "/hr/org-chart" },
  { key: "jds", href: "/hr/jds" },
  { key: "certifications", href: "/hr/certifications" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/hr") return pathname === "/hr";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabNav() {
  const t = useTranslations("hr.tabs");
  const pathname = usePathname();

  const items: TabItem[] = TABS.map((tab) => ({
    key: tab.key,
    label: t(tab.key),
    href: tab.href,
    active: isActive(pathname, tab.href),
  }));

  return (
    <Tabs
      ariaLabel="HR tabs"
      items={items}
      renderLink={(item, className) => (
        <Link href={item.href} className={className}>
          {item.label}
        </Link>
      )}
    />
  );
}
