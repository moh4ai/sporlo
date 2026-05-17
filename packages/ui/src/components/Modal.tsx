"use client";

import * as React from "react";
import { cn } from "../lib/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-spo-ink/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "max-h-[90vh] w-full max-w-lg overflow-auto rounded-card-lg bg-white p-6 shadow-2xl",
          className,
        )}
      >
        {title && (
          <h2 className="mb-4 text-lg font-semibold text-spo-ink">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
