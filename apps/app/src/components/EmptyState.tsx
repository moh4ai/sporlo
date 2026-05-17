import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

import { Badge, Button, Card, cn } from "@sporlo/ui";

import { PageHeader } from "./PageHeader";

export interface EmptyStateProps {
  title: string;
  body: string;
  ctaLabel: string;
  comingSoonLabel: string;
  /** Optional icon shown in the hero. Defaults to a sparkle. */
  icon?: LucideIcon;
  className?: string;
}

export function EmptyState({
  title,
  body,
  ctaLabel,
  comingSoonLabel,
  icon: Icon = Sparkles,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("mx-auto max-w-3xl space-y-6", className)}>
      <PageHeader title={title} />
      <Card className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-1 items-start gap-4">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-spo-green-soft text-spo-green-deep"
              aria-hidden="true"
            >
              <Icon className="size-5" />
            </div>
            <p className="max-w-prose text-spo-muted">{body}</p>
          </div>
          <Badge tone="amber">{comingSoonLabel}</Badge>
        </div>
        <Button disabled variant="secondary">
          {ctaLabel}
        </Button>
      </Card>
    </div>
  );
}
