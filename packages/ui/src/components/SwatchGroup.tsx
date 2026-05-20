"use client";

import * as React from "react";
import { cn } from "../lib/cn";

export interface SwatchOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SwatchGroupProps {
  options: SwatchOption[];
  value: string | null;
  onChange: (next: string) => void;
  ariaLabel?: string;
  className?: string;
}

// Radio-group of pill-shaped chips for size/colour pickers. Keyboard:
// ←/→ moves selection across enabled options; disabled chips render with
// a line-through but remain focusable so a user can read why the combo
// is unavailable.
export function SwatchGroup({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SwatchGroupProps) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  function focusNext(currentIndex: number, dir: 1 | -1) {
    const n = options.length;
    for (let i = 1; i <= n; i++) {
      const next = (currentIndex + dir * i + n) % n;
      const candidate = options[next];
      if (candidate && !candidate.disabled) {
        const node = refs.current[next];
        if (node) {
          node.focus();
          onChange(candidate.value);
        }
        return;
      }
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-disabled={opt.disabled || undefined}
            tabIndex={active ? 0 : -1}
            onClick={() => {
              if (opt.disabled) return;
              onChange(opt.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                focusNext(i, 1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                focusNext(i, -1);
              }
            }}
            className={cn(
              "inline-flex min-w-12 items-center justify-center rounded-pill border px-4 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-spo-green bg-spo-green-soft text-spo-green-deep"
                : "border-spo-line bg-white text-spo-ink-2 hover:border-spo-green/50 hover:bg-spo-paper",
              opt.disabled &&
                "cursor-not-allowed text-spo-muted line-through opacity-60 hover:border-spo-line hover:bg-white",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
