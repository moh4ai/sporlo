import * as React from "react";
import { cn } from "../lib/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full rounded-xl border bg-white px-3 py-2 text-base text-spo-ink",
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
