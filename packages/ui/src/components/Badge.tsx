import * as React from "react";
import { cn } from "../lib/cn";

type Tone = "neutral" | "green" | "blue" | "purple" | "pink" | "amber" | "danger";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-spo-paper text-spo-ink border-spo-line",
  green: "bg-spo-green-soft text-spo-green-deep border-spo-green/20",
  blue: "bg-spo-blue/10 text-spo-blue border-spo-blue/20",
  purple: "bg-spo-purple/10 text-spo-purple border-spo-purple/20",
  pink: "bg-spo-pink/10 text-spo-pink border-spo-pink/20",
  amber: "bg-spo-amber/10 text-spo-amber border-spo-amber/20",
  danger: "bg-spo-danger/10 text-spo-danger border-spo-danger/20",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  );
}
