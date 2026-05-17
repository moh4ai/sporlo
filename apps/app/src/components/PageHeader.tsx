import type { ReactNode } from "react";

import { cn } from "@sporlo/ui";

export interface PageHeaderProps {
  /** Main page title — renders in the display font. */
  title: ReactNode;
  /** Optional subtitle shown muted under the title. */
  subtitle?: ReactNode;
  /** Optional breadcrumbs rendered above the title. */
  breadcrumbs?: ReactNode;
  /** Optional right-aligned actions (buttons, dropdowns). */
  actions?: ReactNode;
  /** Optional tabs row rendered under the title (and subtitle). */
  tabs?: ReactNode;
  /** Adjust title size. Default "lg". */
  size?: "md" | "lg";
  className?: string;
}

/**
 * Canonical dashboard page header. Every module layout should render this
 * once at the top to keep typographic rhythm and action placement consistent.
 *
 *   <PageHeader
 *     title={t("title")}
 *     subtitle={t("subtitle")}
 *     breadcrumbs={<Breadcrumb items={…} />}
 *     actions={<Button>{t("new")}</Button>}
 *     tabs={<TabNav />}
 *   />
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  tabs,
  size = "lg",
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("space-y-4", className)}>
      {breadcrumbs && <div>{breadcrumbs}</div>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1
            className={cn(
              "font-semibold text-spo-ink",
              size === "lg" ? "text-3xl" : "text-2xl",
            )}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h1>
          {subtitle && <p className="max-w-prose text-sm text-spo-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {tabs && <div>{tabs}</div>}
    </header>
  );
}
