import * as React from "react";

export interface EmptyTableRowProps {
  /** Number of columns the cell should span. */
  colSpan: number;
  children: React.ReactNode;
}

export function EmptyTableRow({ colSpan, children }: EmptyTableRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-spo-muted">
        {children}
      </td>
    </tr>
  );
}
