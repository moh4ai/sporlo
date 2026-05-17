"use client";

import * as React from "react";
import { cn } from "../lib/cn";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
  labels?: {
    prev?: string;
    next?: string;
    pageOf?: (p: number, n: number) => string;
  };
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
  labels,
}: PaginationProps) {
  const prev = labels?.prev ?? "Prev";
  const next = labels?.next ?? "Next";
  const pageOf = labels?.pageOf ?? ((p, n) => `${p} / ${n}`);

  return (
    <nav
      className={cn("flex items-center justify-between gap-3", className)}
      aria-label="Pagination"
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="rounded-pill border border-spo-line bg-white px-3 py-1.5 text-sm text-spo-ink-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-spo-paper"
      >
        {prev}
      </button>
      <span className="text-sm text-spo-muted">{pageOf(page, Math.max(1, pageCount))}</span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        disabled={page >= pageCount}
        className="rounded-pill border border-spo-line bg-white px-3 py-1.5 text-sm text-spo-ink-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-spo-paper"
      >
        {next}
      </button>
    </nav>
  );
}
