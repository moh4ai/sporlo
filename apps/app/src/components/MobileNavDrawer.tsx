"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import type { Principal } from "@sporlo/auth";

import { SidebarNav } from "./SidebarNav";

export function MobileNavDrawer({
  open,
  onClose,
  principal,
}: {
  open: boolean;
  onClose: () => void;
  principal: Principal;
}) {
  const t = useTranslations("nav");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // Lock body scroll while open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("openMenu")}
      className="fixed inset-0 z-50 bg-spo-ink/40 md:hidden"
      onClick={onClose}
    >
      <div
        className="me-auto flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-[var(--shadow-3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-spo-line px-5 py-4">
          <div className="flex items-center gap-2">
            <Image
              src="/brand/sporlo-logo-green.png"
              alt="Sporlo"
              width={28}
              height={28}
            />
            <span
              className="text-xl text-spo-green-deep"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Sporlo
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeMenu")}
            className="rounded-md p-1.5 text-spo-muted transition-colors hover:bg-spo-paper hover:text-spo-ink"
          >
            <X className="size-5" />
          </button>
        </div>
        <SidebarNav principal={principal} onNavigate={onClose} />
      </div>
    </div>
  );
}
