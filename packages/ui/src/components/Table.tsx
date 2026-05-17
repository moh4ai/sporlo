import * as React from "react";
import { cn } from "../lib/cn";

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-card border border-spo-line bg-white">
      <table
        className={cn("min-w-full text-start text-sm text-spo-ink", className)}
        {...props}
      />
    </div>
  );
}

export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-spo-paper text-xs uppercase text-spo-muted" {...props} />;
}

export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-spo-line" {...props} />;
}

export function TR(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} />;
}

export function TH({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn("px-4 py-3 text-start font-medium", className)}
      {...props}
    />
  );
}

export function TD({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3", className)} {...props} />;
}
