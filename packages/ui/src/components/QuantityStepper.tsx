"use client";

import * as React from "react";
import { cn } from "../lib/cn";

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  className?: string;
  ariaLabel?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = Number.POSITIVE_INFINITY,
  className,
  ariaLabel,
}: QuantityStepperProps) {
  const clamped = Math.max(min, Math.min(max, value));
  const canDec = clamped > min;
  const canInc = clamped < max;

  function step(delta: number) {
    const next = Math.max(min, Math.min(max, clamped + delta));
    if (next !== clamped) onChange(next);
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-spo-line bg-white",
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={!canDec}
        aria-label="Decrease quantity"
        className="flex size-9 items-center justify-center text-spo-ink-2 transition-colors hover:bg-spo-paper disabled:cursor-not-allowed disabled:text-spo-muted disabled:hover:bg-transparent"
      >
        <MinusIcon className="size-4" />
      </button>
      <span
        dir="ltr"
        aria-live="polite"
        className="min-w-10 select-none text-center text-sm font-medium text-spo-ink"
      >
        {clamped}
      </span>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={!canInc}
        aria-label="Increase quantity"
        className="flex size-9 items-center justify-center text-spo-ink-2 transition-colors hover:bg-spo-paper disabled:cursor-not-allowed disabled:text-spo-muted disabled:hover:bg-transparent"
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}
