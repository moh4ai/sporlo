"use client";

import { Fragment, type ReactNode } from "react";

import { cn } from "../lib/cn";

export interface TabItem {
  key: string;
  label: ReactNode;
  href: string;
  active?: boolean;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  ariaLabel?: string;
  /**
   * Optional render override for the link element. Defaults to a plain `<a>`.
   * Apps using next-intl Link or next/link should pass it via this prop so
   * client-side navigation works correctly:
   *
   *   <Tabs items={…} renderLink={(item, className) => (
   *     <Link href={item.href} className={className}>{item.label}</Link>
   *   )} />
   */
  renderLink?: (item: TabItem, className: string) => ReactNode;
  className?: string;
}

export function Tabs({ items, ariaLabel, renderLink, className }: TabsProps) {
  return (
    <nav
      className={cn("flex flex-wrap gap-2", className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const linkClassName = tabLinkClassName(item.active, item.disabled);
        return (
          <Fragment key={item.key}>
            {renderLink ? (
              renderLink(item, linkClassName)
            ) : (
              <a
                href={item.disabled ? undefined : item.href}
                className={linkClassName}
                aria-current={item.active ? "page" : undefined}
                aria-disabled={item.disabled || undefined}
              >
                {item.label}
              </a>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

export function tabLinkClassName(active = false, disabled = false): string {
  const base =
    "inline-flex items-center rounded-pill border px-4 py-1.5 text-sm transition-colors";
  if (disabled) {
    return cn(
      base,
      "cursor-not-allowed border-spo-line bg-spo-paper text-spo-muted",
    );
  }
  return active
    ? cn(base, "border-spo-green bg-spo-green-soft text-spo-green-deep")
    : cn(base, "border-spo-line bg-white text-spo-ink-2 hover:bg-spo-paper");
}
