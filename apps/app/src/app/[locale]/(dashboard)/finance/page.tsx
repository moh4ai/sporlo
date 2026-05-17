import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card, Stat } from "@sporlo/ui";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

export default async function FinanceOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "finance" });

  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const twelveMonthsAgo = new Date(
    Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth() + 1, 1),
  );

  const { data: thisMonthPaid } = await supabase
    .from("payments")
    .select("amount_sar, provider")
    .eq("status", "paid")
    .gte("paid_at", monthStart.toISOString());
  const thisMonthGross = sumAmount(thisMonthPaid);

  const { data: thisMonthRefunded } = await supabase
    .from("refunds")
    .select("amount_sar")
    .eq("status", "completed")
    .gte("processed_at", monthStart.toISOString());
  const thisMonthRefunds = sumAmount(thisMonthRefunded);

  const { data: last12Paid } = await supabase
    .from("payments")
    .select("amount_sar, provider")
    .eq("status", "paid")
    .gte("paid_at", twelveMonthsAgo.toISOString());
  const last12Gross = sumAmount(last12Paid);

  const { data: last12Refunded } = await supabase
    .from("refunds")
    .select("amount_sar")
    .eq("status", "completed")
    .gte("processed_at", twelveMonthsAgo.toISOString());
  const last12Refunds = sumAmount(last12Refunded);

  const byProvider = new Map<string, number>();
  for (const p of last12Paid ?? []) {
    const k = p.provider ?? "unknown";
    byProvider.set(k, (byProvider.get(k) ?? 0) + Number(p.amount_sar));
  }

  const sarFmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label={t("overview.thisMonth")} value={sarFmt.format(thisMonthGross)} />
        <Stat
          label={t("overview.thisMonthRefunds")}
          value={sarFmt.format(thisMonthRefunds)}
        />
        <Stat
          label={t("overview.thisMonthNet")}
          value={sarFmt.format(thisMonthGross - thisMonthRefunds)}
        />
        <Stat label={t("overview.last12Gross")} value={sarFmt.format(last12Gross)} />
        <Stat label={t("overview.last12Refunds")} value={sarFmt.format(last12Refunds)} />
        <Stat
          label={t("overview.last12Net")}
          value={sarFmt.format(last12Gross - last12Refunds)}
        />
      </div>

      <Card>
        <h3 className="mb-3 text-lg font-semibold text-spo-ink">
          {t("overview.byProviderTitle")}
        </h3>
        {byProvider.size === 0 ? (
          <p className="text-sm text-spo-muted">{t("overview.byProviderEmpty")}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {Array.from(byProvider.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([provider, amount]) => (
                <li
                  key={provider}
                  className="flex items-center justify-between border-b border-spo-line py-1 last:border-0"
                >
                  <span className="text-spo-ink-2">{provider}</span>
                  <span className="font-medium text-spo-ink">
                    {sarFmt.format(amount)}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function sumAmount(rows: Array<{ amount_sar: number | string }> | null | undefined): number {
  if (!rows) return 0;
  return rows.reduce((acc, r) => acc + Number(r.amount_sar), 0);
}
