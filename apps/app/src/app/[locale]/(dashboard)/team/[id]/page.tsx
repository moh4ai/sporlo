import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  SquadDetailClient,
  type PlayerRow,
  type TrainingRow,
} from "./_components/SquadDetailClient";

export default async function SquadDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "team" });
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data: squad } = await supabase
    .from("squads")
    .select("id, name_ar, name_en, season, sport_type")
    .eq("id", id)
    .maybeSingle();
  if (!squad) notFound();

  const { data: roster } = await supabase
    .from("roster_entries")
    .select(
      "id, full_name_ar, full_name_en, jersey_number, position, date_of_birth, nationality, active, bio_ar, bio_en, nationality_flag, height_cm, weight_kg, instagram_handle, joined_club_at, previous_clubs_jsonb",
    )
    .eq("squad_id", id)
    .eq("active", true)
    .order("jersey_number", { ascending: true, nullsFirst: false });

  const players: PlayerRow[] = (roster ?? []).map((p) => ({
    id: p.id,
    full_name_ar: p.full_name_ar,
    full_name_en: p.full_name_en,
    jersey_number: p.jersey_number,
    position: p.position,
    date_of_birth: p.date_of_birth,
    nationality: p.nationality,
    bio_ar: p.bio_ar,
    bio_en: p.bio_en,
    nationality_flag: p.nationality_flag,
    height_cm: p.height_cm,
    weight_kg: p.weight_kg,
    instagram_handle: p.instagram_handle,
    joined_club_at: p.joined_club_at,
    previous_clubs: Array.isArray(p.previous_clubs_jsonb)
      ? (p.previous_clubs_jsonb as Array<{ club?: string; years?: string }>).map(
          (c) => ({ club: c.club ?? "", years: c.years ?? "" }),
        )
      : [],
  }));

  const { data: trainingData } = await supabase
    .from("training_plans")
    .select(
      "id, title_ar, title_en, scheduled_at, duration_minutes, cancelled_at, facility:facilities(name_ar, name_en)",
    )
    .eq("squad_id", id)
    .order("scheduled_at", { ascending: true });

  const trainings: TrainingRow[] = (trainingData ?? []).map((row) => {
    const facility = Array.isArray(row.facility) ? row.facility[0] : row.facility;
    const facilityName =
      locale === "ar" ? facility?.name_ar : facility?.name_en;
    return {
      id: row.id,
      title_ar: row.title_ar,
      title_en: row.title_en,
      scheduled_at: row.scheduled_at,
      duration_minutes: row.duration_minutes,
      facility_name: facilityName ?? null,
      cancelled_at: row.cancelled_at,
    };
  });

  const name = locale === "ar" ? squad.name_ar : squad.name_en;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/team" className="text-sm text-spo-muted hover:text-spo-ink">
        ← {t("common.back")}
      </Link>
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-spo-ink">{name}</h2>
        {squad.season && (
          <p className="text-sm text-spo-muted">
            {t("squads.headers.season")}: {squad.season}
          </p>
        )}
      </header>

      <SquadDetailClient
        squadId={id}
        players={players}
        trainings={trainings}
        principal={{ role: tenant.user_role, department: tenant.department }}
        locale={locale as "ar" | "en"}
      />
    </div>
  );
}
