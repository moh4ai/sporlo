"use client";

import * as React from "react";
import { cn } from "../lib/cn";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Side relative to the document — RTL flips automatically via CSS. */
  side?: "end" | "start";
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  widthClassName?: string;
}

export function Drawer({
  open,
  onClose,
  side = "end",
  title,
  children,
  className,
  widthClassName = "max-w-md",
}: DrawerProps) {
  const titleId = React.useId();
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const opener = document.activeElement as HTMLElement | null;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      className="fixed inset-0 z-50 flex bg-spo-ink/40"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "ms-auto flex h-full w-full flex-col bg-white shadow-[var(--shadow-3)]",
          widthClassName,
          side === "start" && "me-auto ms-0",
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-spo-line px-5 py-4">
            <h2
              id={titleId}
              className="text-lg font-semibold text-spo-ink"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-9 items-center justify-center rounded-md text-spo-muted transition-colors hover:bg-spo-paper hover:text-spo-ink"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
