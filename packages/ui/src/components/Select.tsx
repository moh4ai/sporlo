import * as React from "react";
import { cn } from "../lib/cn";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, invalid, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-11 w-full rounded-xl border bg-white px-3 text-base text-spo-ink",
          invalid ? "border-spo-danger" : "border-spo-line",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
