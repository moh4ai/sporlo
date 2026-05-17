"use client";

import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn";

export interface TooltipProps {
  /** The element that triggers the tooltip. Must accept className + handlers. */
  children: ReactElement<{
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
    "aria-describedby"?: string;
  }>;
  /** The tooltip content. */
  label: ReactNode;
  /** Visual placement. Default: top. */
  side?: "top" | "bottom" | "left" | "right";
  /** Hide on mobile (no-hover surfaces). Default true — saves accidental tap activation. */
  hideOnMobile?: boolean;
  className?: string;
}

/**
 * Lightweight CSS-only tooltip. Activates on hover + keyboard focus.
 * Not a popper — won't auto-flip near viewport edges, so use sparingly
 * in dense table headers / inside drawers where edges matter.
 */
export function Tooltip({
  children,
  label,
  side = "top",
  hideOnMobile = true,
  className,
}: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  if (!isValidElement(children)) return children;

  const triggerProps = {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    "aria-describedby": id,
  };

  return (
    <span className={cn("relative inline-flex", hideOnMobile && "max-md:contents")}>
      {cloneElement(children, triggerProps)}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-spo-ink px-2 py-1 text-xs font-medium text-white shadow-[var(--shadow-2)]",
            side === "top" && "bottom-full left-1/2 mb-2 -translate-x-1/2",
            side === "bottom" && "left-1/2 top-full mt-2 -translate-x-1/2",
            side === "left" && "right-full top-1/2 mr-2 -translate-y-1/2",
            side === "right" && "left-full top-1/2 ml-2 -translate-y-1/2",
            className,
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
