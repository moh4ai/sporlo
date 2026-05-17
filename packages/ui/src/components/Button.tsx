import * as React from "react";
import { cn } from "../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-spo-green text-white hover:bg-spo-green-deep disabled:bg-spo-muted",
  secondary:
    "bg-spo-green-soft text-spo-green-deep hover:bg-spo-line disabled:text-spo-muted",
  ghost:
    "bg-transparent text-spo-ink hover:bg-spo-line disabled:text-spo-muted",
  danger:
    "bg-spo-danger text-white hover:opacity-90 disabled:bg-spo-muted",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-base",
  lg: "h-13 px-6 text-lg",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className, type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-pill font-medium transition-colors disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);
