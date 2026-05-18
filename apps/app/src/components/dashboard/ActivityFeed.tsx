import { getTranslations } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";

export type ActivityRow = {
  id: string;
  event_type: string;
  source_module: string;
  occurred_at: string;
  quantitative_value: number | null;
};

const MODULE_TINT: Record<string, string> = {
  memberships: "bg-spo-green/10 text-spo-green-deep",
  finance: "bg-spo-blue/10 text-spo-blue",
  events: "bg-spo-purple/10 text-spo-purple",
  store: "bg-spo-amber/10 text-spo-amber",
  facilities: "bg-spo-pink/10 text-spo-pink",
  academy: "bg-spo-green/10 text-spo-green-deep",
  team: "bg-spo-blue/10 text-spo-blue",
  hr: "bg-spo-purple/10 text-spo-purple",
  governance: "bg-spo-muted/10 text-spo-ink-2",
  media: "bg-spo-pink/10 text-spo-pink",
};

export async function ActivityFeed({
  rows,
  locale,
}: {
  rows: ActivityRow[];
  locale: "ar" | "en";
}) {
  const t = await getTranslations({ locale, namespace: "dashboardCharts.activity" });

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-card border border-spo-line bg-white p-5">
      <header className="mb-4 space-y-0.5">
        <h3 className="text-base font-semibold text-spo-ink">{t("title")}</h3>
        <p className="text-xs text-spo-muted">{t("subtitle")}</p>
      </header>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-spo-muted">{t("empty")}</p>
      ) : (
        <ol className="space-y-3">
          {rows.map((r) => {
            const tint = MODULE_TINT[r.source_module] ?? MODULE_TINT.governance;
            return (
              <li key={r.id} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full ${tint}`}
                >
                  <CheckCircle2 className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm text-spo-ink-2">
                      {t(`events.${r.event_type}`, {
                        default: r.event_type.replace(/_/g, " "),
                      })}
                    </p>
                    <span className="shrink-0 text-[11px] text-spo-muted">
                      {dateFmt.format(new Date(r.occurred_at))}
                    </span>
                  </div>
                  <p className="text-[11px] uppercase tracking-wider text-spo-muted">
                    {r.source_module}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
