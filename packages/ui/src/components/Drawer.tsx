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
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex bg-spo-ink/40"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "ms-auto flex h-full w-full flex-col bg-white shadow-2xl",
          widthClassName,
          side === "start" && "me-auto ms-0",
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-spo-line px-5 py-4">
            <h2 className="text-lg font-semibold text-spo-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-spo-muted hover:text-spo-ink"
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
