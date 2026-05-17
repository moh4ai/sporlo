import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

import {
  ReporterClient,
  type MatchEventRow,
} from "./_components/ReporterClient";

export default async function ReportPage({
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
    .select("id, opponent_ar, opponent_en")
    .eq("id", id)
    .maybeSingle();
  if (!fixture) notFound();

  const { data: events } = await supabase
    .from("match_events")
    .select("id, minute, type, team, player_name, recorded_offline, created_at")
    .eq("fixture_id", id)
    .order("minute", { ascending: true });

  const name = locale === "ar" ? fixture.opponent_ar : fixture.opponent_en;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link
        href={`/events/${id}`}
        className="text-sm text-spo-muted hover:text-spo-ink"
      >
        ← {t("common.back")}
      </Link>
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-spo-ink">{t("report.title")}</h2>
        <p className="text-sm text-spo-muted">
          {name} · {t("report.subtitle")}
        </p>
      </header>

      <ReporterClient
        fixtureId={id}
        serverEvents={(events ?? []) as MatchEventRow[]}
        locale={locale as "ar" | "en"}
      />
    </div>
  );
}
