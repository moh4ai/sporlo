"use client";

import { useTranslations } from "next-intl";

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

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Finance tabs">
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
