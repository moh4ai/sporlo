"use client";

import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";

import { visibleModules, type Principal } from "@sporlo/auth";

import { Link, usePathname } from "@/i18n/navigation";
import {
  NAV_MODULES,
  SECTION_ORDER,
  type NavModule,
  type NavSectionKey,
} from "./nav-config";

/**
 * Sidebar nav body — used both inside the desktop fixed sidebar and the
 * mobile drawer. Renders sections + icon-leading rows.
 */
export function SidebarNav({
  principal,
  onNavigate,
}: {
  principal: Principal;
  /** Called after a link is clicked (used by mobile drawer to close itself). */
  onNavigate?: () => void;
}) {
  const tModules = useTranslations("modules");
  const tSections = useTranslations("nav.sections");
  const pathname = usePathname();
  const visible = new Set(visibleModules(principal));

  // Group visible modules by section, preserving NAV_MODULES order.
  const grouped = new Map<NavSectionKey, NavModule[]>();
  for (const mod of NAV_MODULES) {
    if (!visible.has(mod.key)) continue;
    const list = grouped.get(mod.section) ?? [];
    list.push(mod);
    grouped.set(mod.section, list);
  }

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-6">
        {SECTION_ORDER.map((section) => {
          const items = grouped.get(section);
          if (!items || items.length === 0) return null;
          return (
            <li key={section}>
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-spo-muted">
                {tSections(section)}
              </div>
              <ul className="space-y-0.5">
                {items.map((mod) => (
                  <li key={mod.key}>
                    <SidebarLink
                      href={`/${mod.key}`}
                      label={tModules(mod.key)}
                      icon={mod.icon}
                      active={
                        pathname === `/${mod.key}` ||
                        pathname.startsWith(`/${mod.key}/`)
                      }
                      onClick={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors " +
        (active
          ? "bg-spo-green-soft font-medium text-spo-green-deep"
          : "text-spo-ink-2 hover:bg-spo-paper")
      }
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={"size-4 shrink-0 " + (active ? "text-spo-green-deep" : "text-spo-muted")}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}
