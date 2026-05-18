"use client";

import * as React from "react";
import { cn } from "../lib/cn";

export type SortDirection = "asc" | "desc";

export interface SortState<K extends string> {
  key: K | null;
  direction: SortDirection;
}

export interface SortableTHProps<K extends string> {
  sortKey: K;
  state: SortState<K>;
  onSort: (next: SortState<K>) => void;
  children: React.ReactNode;
  /** Default direction when this column first gets clicked. Defaults to "asc". */
  initialDirection?: SortDirection;
  className?: string;
}

// Clickable column header that toggles sort state via a parent-managed
// SortState. Renders an ▲ / ▼ indicator when this column is the active
// one. Wires to the regular <th> styling from the Table primitive.
export function SortableTH<K extends string>({
  sortKey,
  state,
  onSort,
  initialDirection = "asc",
  children,
  className,
}: SortableTHProps<K>) {
  const active = state.key === sortKey;

  function handleClick() {
    if (!active) {
      onSort({ key: sortKey, direction: initialDirection });
      return;
    }
    onSort({
      key: sortKey,
      direction: state.direction === "asc" ? "desc" : "asc",
    });
  }

  return (
    <th
      className={cn("px-4 py-3 text-start text-[11px] font-semibold", className)}
      aria-sort={
        active ? (state.direction === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider transition-colors hover:text-spo-ink-2",
          active ? "text-spo-ink-2" : "text-spo-muted",
        )}
      >
        <span>{children}</span>
        <SortIcon active={active} direction={state.direction} />
      </button>
    </th>
  );
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  return (
    <svg
      width={10}
      height={12}
      viewBox="0 0 10 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
      className={active ? "opacity-100" : "opacity-40"}
    >
      <path
        d="M5 1L8 4H2L5 1Z"
        fill={active && direction === "asc" ? "currentColor" : "none"}
      />
      <path
        d="M5 11L2 8H8L5 11Z"
        fill={active && direction === "desc" ? "currentColor" : "none"}
      />
    </svg>
  );
}

// React hook for client-side sorting. Returns the current sort state, a
// setter, and the rows sorted accordingly. Stable: same rows reference
// when state hasn't changed (memoisation done by useMemo inside).
export function useTableSort<T, K extends string>(
  rows: T[],
  getters: Record<K, (row: T) => string | number | null>,
  initial: SortState<K> = { key: null, direction: "asc" },
) {
  const [sort, setSort] = React.useState<SortState<K>>(initial);

  const sorted = React.useMemo(() => {
    if (!sort.key) return rows;
    const getter = getters[sort.key];
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va < vb) return -1 * factor;
      if (va > vb) return 1 * factor;
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  return { sort, setSort, sorted };
}
