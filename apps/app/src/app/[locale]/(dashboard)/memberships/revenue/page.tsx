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
        <h3 className="mb-3 text-lg font-semibold text-spo-ink">
          {t("revenue.byMonthTitle")}
        </h3>
        {!hasData ? (
          <p className="text-sm text-spo-muted">{t("revenue.noData")}</p>
        ) : (
          <div className="flex h-48 items-end gap-2">
            {monthly.map(([key, value]) => (
              <div
                key={key}
                className="flex flex-1 flex-col items-center gap-1"
                title={`${monthLabel(key)} — ${sarFmt.format(value)}`}
              >
                <div
                  className="w-full rounded-md bg-spo-green-soft"
                  style={{
                    height: `${Math.max(2, Math.round((value / max) * 100))}%`,
                  }}
                />
                <span className="text-[10px] text-spo-muted">
                  {monthLabel(key)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
