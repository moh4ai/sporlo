"use client";

import { useTranslations } from "next-intl";

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
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Governance tabs">
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
