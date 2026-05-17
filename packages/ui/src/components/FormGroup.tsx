import * as React from "react";
import { cn } from "../lib/cn";

export interface FormGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
}

export function FormGroup({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
  ...props
}: FormGroupProps) {
  return (
    <div className={cn("space-y-1", className)} {...props}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-sm text-spo-ink-2"
      >
        <span>{label}</span>
        {required && (
          <span aria-hidden="true" className="text-spo-danger">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-spo-muted">{hint}</p>
      )}
      {error && (
        <p role="alert" className="text-xs text-spo-danger">
          {error}
        </p>
      )}
    </div>
  );
}
