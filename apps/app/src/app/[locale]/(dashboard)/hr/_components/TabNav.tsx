"use client";

import { useTranslations } from "next-intl";

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
  return (
    <nav className="flex flex-wrap gap-2" aria-label="HR tabs">
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={
              "rounded-pill border px-4 py-1.5 text-sm transition-colors " +
              (active
                ? "border-spo-green bg-spo-green-soft text-spo-green-deep"
                : "border-spo-line bg-white text-spo-ink-2 hover:bg-spo-paper")
            }
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
