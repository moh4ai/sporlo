import * as React from "react";
import { cn } from "../lib/cn";

// Sprint 0 → Phase 1: thin wrapper over the native <input type="date">.
// A Hijri-aware variant lands in Phase 4 (Governance module).

export interface DatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  invalid?: boolean;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  function DatePicker({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        type="date"
        aria-invalid={invalid || undefined}
        className={cn(
          "h-11 w-full rounded-xl border bg-white px-3 text-base text-spo-ink",
          invalid ? "border-spo-danger" : "border-spo-line",
          className,
        )}
        {...props}
      />
    );
  },
);
