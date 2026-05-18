"use client";

import type { ReactNode } from "react";

import { DropdownMenu, type DropdownItem } from "./DropdownMenu";

export interface RowAction {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

export interface RowActionsProps {
  /** All available row actions. Items with `disabled: true` render greyed-out. */
  actions: RowAction[];
  /** Aria label for the trigger. Defaults to "Row actions". */
  label?: string;
}

// Tiny three-dot menu intended for the last column of a table row. Wraps
// DropdownMenu with a square icon trigger and the conventional
// MoreHorizontal glyph rendered inline so the primitive stays icon-set
// agnostic.
export function RowActions({ actions, label = "Row actions" }: RowActionsProps) {
  const items: DropdownItem[] = actions.map((a) => ({
    key: a.key,
    label: a.label,
    icon: a.icon,
    onSelect: a.onSelect,
    href: a.href,
    danger: a.danger,
    disabled: a.disabled,
    separator: a.separator,
  }));

  return (
    <DropdownMenu
      triggerLabel={label}
      trigger={
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx={12} cy={12} r={1} />
          <circle cx={19} cy={12} r={1} />
          <circle cx={5} cy={12} r={1} />
        </svg>
      }
      triggerClassName="size-8 rounded-md text-spo-muted hover:text-spo-ink-2"
      items={items}
      align="end"
    />
  );
}
