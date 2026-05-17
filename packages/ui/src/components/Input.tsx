import * as React from "react";
import { cn } from "../lib/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-11 w-full rounded-xl border bg-white px-3 text-base text-spo-ink",
          "placeholder:text-spo-muted",
          "focus:outline-none",
          invalid ? "border-spo-danger" : "border-spo-line",
          className,
        )}
        {...props}
      />
    );
  },
);
