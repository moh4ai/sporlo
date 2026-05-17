import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card, Stat } from "@sporlo/ui";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

export default async function RevenuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "memberships" });

  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const twelveMonthsAgo = new Date(
    Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth() + 1, 1),
  );

  const { data: paidThisMonth } = await supabase
    .from("payments")
    .select("amount_sar")
    .eq("status", "paid")
    .gte("paid_at", monthStart.toISOString());
  const thisMonthTotal =
    paidThisMonth?.reduce((acc, p) => acc + Number(p.amount_sar), 0) ?? 0;

  const { data: paidLast12 } = await supabase
    .from("payments")
    .select("amount_sar, paid_at")
    .eq("status", "paid")
    .gte("paid_at", twelveMonthsAgo.toISOString());
  const last12Total =
    paidLast12?.reduce((acc, p) => acc + Number(p.amount_sar), 0) ?? 0;

  // Bucket by month.
  const buckets = new Map<string, number>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1),
    );
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, 0);
  }
  for (const p of paidLast12 ?? []) {
    if (!p.paid_at) continue;
    const d = new Date(p.paid_at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + Number(p.amount_sar));
    }
  }
  const monthly = Array.from(buckets.entries());
  const max = Math.max(1, ...monthly.map(([, v]) => v));

  const { count: activeSubs } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  const { count: pendingPayments } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const sarFmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  });
  const monthLabel = (key: string) => {
    const [y, m] = key.split("-");
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
      month: "short",
      year: "2-digit",
    }).format(new Date(Date.UTC(Number(y), Number(m) - 1, 1)));
  };

  const hasData = (paidLast12?.length ?? 0) > 0;

  const lastKey = monthly[monthly.length - 1]?.[0];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-spo-ink">{t("revenue.title")}</h2>
        <p className="text-sm text-spo-muted">{t("revenue.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("revenue.thisMonth")} value={sarFmt.format(thisMonthTotal)} />
        <Stat label={t("revenue.last12Months")} value={sarFmt.format(last12Total)} />
        <Stat label={t("revenue.activeSubscriptions")} value={activeSubs ?? 0} />
        <Stat label={t("revenue.pendingPayments")} value={pendingPayments ?? 0} />
      </div>

      <Card>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold text-spo-ink">
            {t("revenue.byMonthTitle")}
          </h3>
          {hasData && (
            <span className="text-xs text-spo-muted">
              {sarFmt.format(max)} <span className="opacity-60">/ peak</span>
            </span>
          )}
        </div>
        {!hasData ? (
          <p className="text-sm text-spo-muted">{t("revenue.noData")}</p>
        ) : (
          <div className="flex h-56 items-end gap-1.5 sm:gap-2">
            {monthly.map(([key, value]) => {
              const isCurrent = key === lastKey;
              const pct = Math.max(2, Math.round((value / max) * 100));
              return (
                <div
                  key={key}
                  className="group relative flex flex-1 flex-col items-center gap-2"
                >
                  <div className="relative flex h-full w-full items-end">
                    <div
                      className={
                        "w-full rounded-md transition-all " +
                        (isCurrent
                          ? "bg-spo-green hover:bg-spo-green-deep"
                          : "bg-spo-green-soft hover:bg-spo-green/40")
                      }
                      style={{ height: `${pct}%` }}
                    />
                    {/* Hover tooltip — pure CSS */}
                    <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-spo-ink px-2 py-1 text-[10px] text-white opacity-0 shadow-[var(--shadow-2)] transition-opacity group-hover:opacity-100">
                      {sarFmt.format(value)}
                    </div>
                  </div>
                  <span
                    className={
                      "text-[10px] " +
                      (isCurrent ? "font-semibold text-spo-ink-2" : "text-spo-muted")
                    }
                  >
                    {monthLabel(key)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
