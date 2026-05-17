import * as React from "react";
import { cn } from "../lib/cn";

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; tone?: "up" | "down" | "flat" };
  hint?: string;
}

const deltaTone: Record<NonNullable<StatProps["delta"]>["tone"] & string, string> = {
  up: "text-spo-success",
  down: "text-spo-danger",
  flat: "text-spo-muted",
};

export function Stat({ label, value, delta, hint, className, ...props }: StatProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-spo-line bg-white p-5",
        className,
      )}
      {...props}
    >
      <div className="text-sm text-spo-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-2xl font-semibold text-spo-ink">{value}</div>
        {delta && (
          <div className={cn("text-sm font-medium", deltaTone[delta.tone ?? "flat"])}>
            {delta.value}
          </div>
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-spo-muted">{hint}</div>}
    </div>
  );
}
