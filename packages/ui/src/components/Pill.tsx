import * as React from "react";
import { cn } from "../lib/cn";

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  active?: boolean;
}

export function Pill({ className, active, ...props }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border px-3 py-1 text-sm",
        active
          ? "border-spo-green bg-spo-green-soft text-spo-green-deep"
          : "border-spo-line bg-white text-spo-ink-2",
        className,
      )}
      {...props}
    />
  );
}
