import type { ReactNode } from "react";

import { cn } from "../lib/cn";

export type AlertTone = "info" | "success" | "warning" | "danger";

export interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Optional right-aligned action node (e.g. a button or dismiss `X`). */
  action?: ReactNode;
  /** Optional leading icon (rendered as-is). */
  icon?: ReactNode;
  className?: string;
}

const TONE_STYLES: Record<AlertTone, { bg: string; border: string; title: string; body: string }> = {
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    title: "text-blue-900",
    body: "text-blue-800",
  },
  success: {
    bg: "bg-spo-green-soft",
    border: "border-spo-green/30",
    title: "text-spo-green-deep",
    body: "text-spo-green-deep/90",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    title: "text-amber-900",
    body: "text-amber-900/90",
  },
  danger: {
    bg: "bg-red-50",
    border: "border-red-200",
    title: "text-red-900",
    body: "text-red-900/90",
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
  icon,
  className,
}: AlertProps) {
  const styles = TONE_STYLES[tone];
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-md border px-4 py-3 text-sm",
        styles.bg,
        styles.border,
        className,
      )}
    >
      {icon && <div className={cn("mt-0.5 shrink-0", styles.title)}>{icon}</div>}
      <div className="flex-1 space-y-1">
        {title && <p className={cn("font-semibold", styles.title)}>{title}</p>}
        {children && <div className={styles.body}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
