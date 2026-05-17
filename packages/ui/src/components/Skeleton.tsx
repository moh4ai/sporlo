import type { CSSProperties } from "react";

import { cn } from "../lib/cn";

export interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

/**
 * Generic skeleton block. Animated shimmer respects prefers-reduced-motion
 * via the global rule in tokens.css.
 */
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block animate-pulse rounded-md bg-spo-paper",
        className,
      )}
      style={style}
    />
  );
}

export interface SkeletonTextProps {
  /** Number of lines. Last line is rendered shorter for visual balance. */
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-3",
            i === lines - 1 ? "w-2/3" : "w-full",
          )}
        />
      ))}
    </div>
  );
}

export interface SkeletonRowProps {
  /** Number of cells per row. */
  columns?: number;
  /** Number of rows. */
  rows?: number;
}

/**
 * Drop-in replacement for table body while data loads. Renders the right
 * shape (tr/td) so it can sit inside an existing Table > TBody.
 */
export function SkeletonRows({ columns = 4, rows = 5 }: SkeletonRowProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-spo-line">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <Skeleton className="h-3 w-full max-w-[180px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export interface SkeletonCardProps {
  className?: string;
  showAvatar?: boolean;
  lines?: number;
}

export function SkeletonCard({
  className,
  showAvatar = false,
  lines = 2,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-spo-line bg-white p-5",
        className,
      )}
      aria-busy="true"
    >
      <div className="flex items-start gap-3">
        {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <SkeletonText lines={lines} />
        </div>
      </div>
    </div>
  );
}
