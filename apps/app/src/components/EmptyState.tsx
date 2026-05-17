import { Badge, Button, Card } from "@sporlo/ui";

export function EmptyState({
  title,
  body,
  ctaLabel,
  comingSoonLabel,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  comingSoonLabel: string;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1
          className="text-3xl font-semibold text-spo-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h1>
      </header>
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <p className="max-w-prose text-spo-muted">{body}</p>
          <Badge tone="amber">{comingSoonLabel}</Badge>
        </div>
        <Button disabled variant="secondary">
          {ctaLabel}
        </Button>
      </Card>
    </div>
  );
}
