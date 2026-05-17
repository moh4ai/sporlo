import * as React from "react";
import { cn } from "../lib/cn";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  removable?: boolean;
  onRemove?: () => void;
}

export function Tag({
  className,
  children,
  removable,
  onRemove,
  ...props
}: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-spo-line bg-white px-2 py-1 text-xs text-spo-ink-2",
        className,
      )}
      {...props}
    >
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove tag"
          className="text-spo-muted hover:text-spo-ink"
        >
          ×
        </button>
      )}
    </span>
  );
}
