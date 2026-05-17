"use client";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn";

export interface DropdownItem {
  key: string;
  label: ReactNode;
  onSelect?: () => void;
  href?: string;
  icon?: ReactNode;
  /** Renders this row in danger style. */
  danger?: boolean;
  disabled?: boolean;
  /** Insert a divider before this item. */
  separator?: boolean;
}

export interface DropdownMenuProps {
  /** The trigger button content. */
  trigger: ReactNode;
  items: DropdownItem[];
  /** Visual alignment relative to the trigger. */
  align?: "start" | "end";
  /** Aria label for the trigger when it's icon-only. */
  triggerLabel?: string;
  /** Render override for items that link to a route. */
  renderLink?: (item: DropdownItem, className: string) => ReactNode;
  triggerClassName?: string;
}

export function DropdownMenu({
  trigger,
  items,
  align = "end",
  triggerLabel,
  renderLink,
  triggerClassName,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm text-spo-ink-2 transition-colors hover:bg-spo-paper",
          triggerClassName,
        )}
      >
        {trigger}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 mt-1 min-w-[10rem] overflow-hidden rounded-md border border-spo-line bg-white py-1 shadow-[var(--shadow-3)]",
            align === "end" ? "right-0 rtl:right-auto rtl:left-0" : "left-0 rtl:left-auto rtl:right-0",
          )}
        >
          {items.map((item) => {
            const itemClass = cn(
              "flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition-colors",
              item.disabled
                ? "cursor-not-allowed text-spo-muted"
                : item.danger
                  ? "text-spo-danger hover:bg-red-50"
                  : "text-spo-ink-2 hover:bg-spo-paper",
            );
            return (
              <Fragment key={item.key}>
                {item.separator && (
                  <div className="my-1 h-px bg-spo-line" role="separator" />
                )}
                {item.href ? (
                  renderLink ? (
                    renderLink(item, itemClass)
                  ) : (
                    <a href={item.href} role="menuitem" className={itemClass}>
                      {item.icon}
                      {item.label}
                    </a>
                  )
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      if (item.disabled) return;
                      item.onSelect?.();
                      setOpen(false);
                    }}
                    className={itemClass}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                )}
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
