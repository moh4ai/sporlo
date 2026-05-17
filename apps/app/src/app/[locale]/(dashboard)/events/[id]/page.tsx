import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge, Card, CardHeader, CardTitle, Stat } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

import { InventoryClient, type SectionRow } from "./_components/InventoryClient";

export default async function FixtureDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "events" });

  const supabase = await createSupabaseServerClient();
  const { data: fixture } = await supabase
    .from("fixtures")
    .select(
      "id, opponent_ar, opponent_en, kickoff_at, venue, status, home_score, away_score",
    )
    .eq("id", id)
    .maybeSingle();
  if (!fixture) notFound();

  // Sections with pricing.
  const { data: sectionData } = await supabase
    .from("venue_sections")
    .select(
      "id, label, rows_count, seats_per_row, capacity, pricing:pricing_tiers(label, price_sar, member_price_sar)",
    )
    .eq("fixture_id", id)
    .order("display_order", { ascending: true });

  const sections: SectionRow[] = (sectionData ?? []).map((s) => {
    const tier = Array.isArray(s.pricing) ? s.pricing[0] : s.pricing;
    return {
      id: s.id,
      label: s.label,
      rows_count: s.rows_count,
      seats_per_row: s.seats_per_row,
      capacity: s.capacity,
      pricing_label: tier?.label ?? null,
      price_sar: tier?.price_sar != null ? Number(tier.price_sar) : null,
      member_price_sar:
        tier?.member_price_sar != null ? Number(tier.member_price_sar) : null,
    };
  });

  // Ticket stats.
  const { count: paidCount } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("fixture_id", id)
    .eq("status", "paid");
  const { count: scannedCount } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("fixture_id", id)
    .eq("status", "paid")
    .not("scanned_at", "is", null);

  const totalCapacity = sections.reduce((acc, s) => acc + s.capacity, 0);
  const name = locale === "ar" ? fixture.opponent_ar : fixture.opponent_en;
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-6">
      <Link href="/events" className="text-sm text-spo-muted hover:text-spo-ink">
        ← {t("common.back")}
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-spo-ink">{name}</h2>
          <div className="flex items-center gap-2 text-sm text-spo-muted">
            <span>{dateFmt.format(new Date(fixture.kickoff_at))}</span>
            <span>·</span>
            <span>{fixture.venue ?? "—"}</span>
            <Badge tone="amber">{t(`fixtures.statuses.${fixture.status as "scheduled" | "in_progress" | "completed" | "cancelled"}`)}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/events/${id}/scan`}
            className="rounded-pill border border-spo-line bg-white px-3 py-1.5 text-sm text-spo-ink-2 hover:bg-spo-paper"
          >
            {t("detail.scanner")}
          </Link>
          <Link
            href={`/events/${id}/report`}
            className="rounded-pill border border-spo-line bg-white px-3 py-1.5 text-sm text-spo-ink-2 hover:bg-spo-paper"
          >
            {t("detail.report")}
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("detail.ticketsAvailable")} value={totalCapacity} />
        <Stat label={t("detail.ticketsSold")} value={paidCount ?? 0} />
        <Stat label={t("detail.ticketsScanned")} value={scannedCount ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("sections.title")}</CardTitle>
        </CardHeader>
        <InventoryClient fixtureId={id} sections={sections} locale={locale as "ar" | "en"} />
      </Card>
    </div>
  );
}
