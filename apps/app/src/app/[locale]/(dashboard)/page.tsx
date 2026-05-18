import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  CalendarDays,
  Users,
  Wallet,
  RotateCcw,
} from "lucide-react";

import { ActivityFeed, type ActivityRow } from "@/components/dashboard/ActivityFeed";
import { MetricTile } from "@/components/dashboard/MetricTile";
import { RevenueChart, type RevenuePoint } from "@/components/dashboard/RevenueChart";
import { SubscriptionMix } from "@/components/dashboard/SubscriptionMix";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

export default async function DashboardHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "dashboard" });

  const tenant = await getActiveTenant();
  const supabase = await createSupabaseServerClient();

  // Compute period boundaries up front so every query references the same
  // ranges (avoids drift across awaits).
  const now = new Date();
  const last30Start = new Date(now);
  last30Start.setDate(last30Start.getDate() - 30);
  const last60Start = new Date(now);
  last60Start.setDate(last60Start.getDate() - 60);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    activeMembers,
    paymentsLast30,
    paymentsPrev30,
    paymentsSix,
    subsStatus,
    upcomingFixtures,
    pendingRefunds,
    recentEvents,
  ] = await Promise.all([
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("payments")
      .select("amount_sar")
      .eq("status", "paid")
      .gte("paid_at", last30Start.toISOString()),
    supabase
      .from("payments")
      .select("amount_sar")
      .eq("status", "paid")
      .gte("paid_at", last60Start.toISOString())
      .lt("paid_at", last30Start.toISOString()),
    supabase
      .from("payments")
      .select("amount_sar, paid_at")
      .eq("status", "paid")
      .gte("paid_at", sixMonthsAgo.toISOString()),
    supabase.from("subscriptions").select("status"),
    supabase
      .from("fixtures")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled")
      .gte("kickoff_at", now.toISOString()),
    supabase
      .from("refunds")
      .select("id", { count: "exact", head: true })
      .eq("status", "requested"),
    supabase
      .from("kpi_events")
      .select("id, event_type, source_module, occurred_at, quantitative_value")
      .order("occurred_at", { ascending: false })
      .limit(10),
  ]);

  const activeMemberCount = activeMembers.count ?? 0;

  const revenueLast30 = (paymentsLast30.data ?? []).reduce(
    (sum, p) => sum + Number(p.amount_sar),
    0,
  );
  const revenuePrev30 = (paymentsPrev30.data ?? []).reduce(
    (sum, p) => sum + Number(p.amount_sar),
    0,
  );
  const revenueDeltaPct =
    revenuePrev30 > 0
      ? ((revenueLast30 - revenuePrev30) / revenuePrev30) * 100
      : revenueLast30 > 0
        ? 100
        : 0;

  // 6-month revenue series.
  const monthBuckets = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthBuckets.set(key, 0);
  }
  for (const p of paymentsSix.data ?? []) {
    if (!p.paid_at) continue;
    const d = new Date(p.paid_at as string);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthBuckets.has(key)) {
      monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + Number(p.amount_sar));
    }
  }
  const revenueSeries: RevenuePoint[] = [...monthBuckets.entries()].map(
    ([month, total]) => ({ month, total }),
  );

  const mix = (subsStatus.data ?? []).reduce(
    (acc, s) => {
      const status = s.status as keyof typeof acc;
      if (status in acc) acc[status] += 1;
      return acc;
    },
    { active: 0, frozen: 0, cancelled: 0, expired: 0, pending: 0 } as Record<
      "active" | "frozen" | "cancelled" | "expired" | "pending",
      number
    >,
  );

  const sarFmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  });

  const activity: ActivityRow[] = (recentEvents.data ?? []).map((r) => ({
    id: r.id as string,
    event_type: r.event_type as string,
    source_module: r.source_module as string,
    occurred_at: r.occurred_at as string,
    quantitative_value: r.quantitative_value as number | null,
  }));

  // Silence unused-variable lint while still acknowledging tenant context.
  void tenant;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="space-y-1">
        <h1
          className="text-3xl font-semibold text-spo-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("welcome")}
        </h1>
        <p className="max-w-2xl text-spo-muted">{t("intro")}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label={t("metrics.activeMembers")}
          value={activeMemberCount}
          icon={Users}
          tone="positive"
          hint={t("metrics.activeMembersHint")}
        />
        <MetricTile
          label={t("metrics.revenue30")}
          value={sarFmt.format(revenueLast30)}
          icon={Wallet}
          trend={{ delta: revenueDeltaPct }}
          hint={t("metrics.revenue30Hint")}
        />
        <MetricTile
          label={t("metrics.upcomingMatches")}
          value={upcomingFixtures.count ?? 0}
          icon={CalendarDays}
          hint={t("metrics.upcomingMatchesHint")}
        />
        <MetricTile
          label={t("metrics.pendingRefunds")}
          value={pendingRefunds.count ?? 0}
          icon={RotateCcw}
          tone={(pendingRefunds.count ?? 0) > 0 ? "warning" : "neutral"}
          hint={t("metrics.pendingRefundsHint")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueChart data={revenueSeries} locale={locale as "ar" | "en"} />
        <SubscriptionMix mix={mix} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityFeed rows={activity} locale={locale as "ar" | "en"} />
        <div className="rounded-card border border-spo-line bg-spo-paper-warm p-5">
          <h3 className="text-base font-semibold text-spo-ink">{t("tip.title")}</h3>
          <p className="mt-1 text-sm text-spo-muted">{t("tip.body")}</p>
        </div>
      </div>
    </div>
  );
}
