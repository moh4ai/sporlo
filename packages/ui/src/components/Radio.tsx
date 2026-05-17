import * as React from "react";
import { cn } from "../lib/cn";

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  function Radio({ className, label, id, ...props }, ref) {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    return (
      <label
        htmlFor={inputId}
        className={cn(
          "flex cursor-pointer items-center gap-2 text-sm text-spo-ink-2",
          className,
        )}
      >
        <input
          ref={ref}
          id={inputId}
          type="radio"
          className="h-4 w-4 accent-spo-green"
          {...props}
        />
        {label != null && <span>{label}</span>}
      </label>
    );
  },
);
