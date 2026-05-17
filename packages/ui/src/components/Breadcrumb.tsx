"use client";

import { Fragment, type ReactNode } from "react";

import { cn } from "../lib/cn";

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  /** Mark the final item explicitly so it's not rendered as a link. */
  current?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Render override for the link element, e.g. next-intl Link. */
  renderLink?: (item: BreadcrumbItem, className: string) => ReactNode;
  className?: string;
  /** Separator between items. Default: forward slash; RTL flips natural. */
  separator?: ReactNode;
}

export function Breadcrumb({
  items,
  renderLink,
  className,
  separator = "/",
}: BreadcrumbProps) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm text-spo-muted", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const isCurrent = item.current ?? isLast;
          const linkClass = "hover:text-spo-ink transition-colors";
          return (
            <Fragment key={i}>
              <li className={isCurrent ? "font-medium text-spo-ink-2" : undefined}>
                {isCurrent || !item.href ? (
                  <span aria-current={isCurrent ? "page" : undefined}>
                    {item.label}
                  </span>
                ) : renderLink ? (
                  renderLink(item, linkClass)
                ) : (
                  <a href={item.href} className={linkClass}>
                    {item.label}
                  </a>
                )}
              </li>
              {!isLast && (
                <li aria-hidden="true" className="text-spo-line">
                  {separator}
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
