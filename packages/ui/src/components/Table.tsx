import * as React from "react";
import { cn } from "../lib/cn";

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /**
   * When true, on `<md:` viewports the table reflows into a card-stack:
   * thead is hidden, each row becomes a card, each cell becomes a labelled
   * row inside it. TDs in such tables must pass a `label` prop so the cell
   * is captioned in card mode (the global CSS in tokens.css handles render).
   */
  responsive?: boolean;
}

export function Table({
  className,
  responsive,
  ...props
}: TableProps) {
  return (
    <div
      data-responsive={responsive ? "true" : undefined}
      className={cn(
        "overflow-x-auto rounded-card border border-spo-line bg-white",
      )}
    >
      <table
        className={cn("min-w-full text-start text-sm text-spo-ink", className)}
        {...props}
      />
    </div>
  );
}

export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className="bg-spo-paper text-xs uppercase tracking-wider text-spo-muted"
      {...props}
    />
  );
}

export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-spo-line" {...props} />;
}

export function TR({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("transition-colors hover:bg-spo-paper/60", className)}
      {...props}
    />
  );
}

export function TH({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-start text-[11px] font-semibold",
        className,
      )}
      {...props}
    />
  );
}

export interface TDProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /**
   * Cell label, only rendered when the parent Table has `responsive` set
   * and the viewport is below md. Set this to the same string as the column's
   * TH content so the card-stack row reads correctly.
   */
  label?: string;
}

export function TD({ className, label, ...props }: TDProps) {
  return (
    <td
      data-label={label}
      className={cn("px-4 py-3 align-middle", className)}
      {...props}
    />
  );
}
