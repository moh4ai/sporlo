import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";

// Single-stat dashboard tile. Optional trend arrow (vs previous period)
// and an icon in the top-right. Pure presentational — server component.

export function MetricTile({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  tone = "neutral",
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  /**
   * Optional trend vs previous period. Pass +N for up, -N for down, 0 for
   * no change. Rendered as ▲/▼ + percentage.
   */
  trend?: { delta: number; label?: string } | null;
  tone?: "neutral" | "positive" | "warning";
}) {
  const accentBg =
    tone === "positive"
      ? "bg-spo-green-soft text-spo-green-deep"
      : tone === "warning"
        ? "bg-spo-amber/10 text-spo-amber"
        : "bg-spo-paper text-spo-muted";

  return (
    <div className="rounded-card border border-spo-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-spo-muted">
          {label}
        </p>
        {Icon && (
          <span
            className={`inline-flex size-9 items-center justify-center rounded-md ${accentBg}`}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-3">
        <span
          className="text-3xl font-semibold text-spo-ink sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {value}
        </span>
        {trend != null && <TrendBadge delta={trend.delta} label={trend.label} />}
      </div>
      {hint && <p className="mt-1 text-xs text-spo-muted">{hint}</p>}
    </div>
  );
}

function TrendBadge({ delta, label }: { delta: number; label?: string }) {
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const tone =
    delta > 0
      ? "text-spo-green-deep bg-spo-green-soft"
      : delta < 0
        ? "text-spo-danger bg-spo-danger/10"
        : "text-spo-muted bg-spo-paper";
  const abs = Math.abs(delta);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      <span>
        {abs.toFixed(0)}%{label ? ` ${label}` : ""}
      </span>
    </span>
  );
}
