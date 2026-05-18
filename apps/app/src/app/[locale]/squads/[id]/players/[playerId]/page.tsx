import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Calendar, ExternalLink, MapPin, Ruler, Trophy, Weight } from "lucide-react";

import { Card } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { PublicShell } from "@/components/PublicShell";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string; playerId: string }>;
}) {
  const { locale, id: squadId, playerId } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "playerProfile" });

  const tenant = await resolvePublicTenant();
  if (!tenant) notFound();

  const admin = createServiceRoleClient();

  const [{ data: player }, { data: squad }] = await Promise.all([
    admin
      .from("roster_entries")
      .select(
        "id, full_name_ar, full_name_en, jersey_number, position, photo_path, nationality, bio_ar, bio_en, nationality_flag, height_cm, weight_kg, instagram_handle, joined_club_at, previous_clubs_jsonb, squad_id, active",
      )
      .eq("id", playerId)
      .eq("org_id", tenant.org_id)
      .eq("active", true)
      .maybeSingle(),
    admin
      .from("squads")
      .select("id, name_ar, name_en, season")
      .eq("id", squadId)
      .eq("org_id", tenant.org_id)
      .maybeSingle(),
  ]);

  if (!player) notFound();
  if (player.squad_id !== squadId) notFound();

  const name =
    locale === "ar"
      ? (player.full_name_ar as string)
      : (player.full_name_en as string | null) ?? (player.full_name_ar as string);
  const bio =
    locale === "ar"
      ? (player.bio_ar as string | null)
      : (player.bio_en as string | null);
  const squadName = squad
    ? locale === "ar"
      ? (squad.name_ar as string)
      : (squad.name_en as string)
    : null;

  const previousClubs = Array.isArray(player.previous_clubs_jsonb)
    ? (player.previous_clubs_jsonb as Array<{ club: string; years?: string }>)
    : [];

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "long",
  });

  return (
    <PublicShell locale={locale} tenant={tenant}>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-spo-muted">
          <Link href="/squads" className="hover:text-spo-ink-2">
            {t("breadcrumb.squads")}
          </Link>
          {squadName && (
            <>
              {" / "}
              <Link href={`/squads/${squadId}`} className="hover:text-spo-ink-2">
                {squadName}
              </Link>
            </>
          )}
        </nav>

        {/* Hero */}
        <section className="overflow-hidden rounded-card-lg border border-spo-line bg-spo-ink text-white shadow-[var(--shadow-2)]">
          <div className="relative grid gap-0 md:grid-cols-[280px_1fr]">
            <div className="relative aspect-[3/4] bg-spo-green-soft/10 md:aspect-auto">
              {player.photo_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={player.photo_path as string}
                  alt={name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full min-h-[280px] w-full items-center justify-center text-[140px] font-bold text-white/15"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {player.jersey_number ?? name.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="space-y-5 p-6 sm:p-8">
              {player.jersey_number && (
                <p
                  className="text-6xl font-bold leading-none text-spo-green-soft/40 sm:text-7xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  #{player.jersey_number}
                </p>
              )}
              <div>
                <h1
                  className="text-3xl font-semibold sm:text-4xl md:text-5xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {name}
                </h1>
                {player.position && (
                  <p className="mt-1 text-sm uppercase tracking-wider text-spo-green-soft">
                    {player.position}
                  </p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {player.nationality_flag && (
                  <Stat
                    icon={<MapPin className="size-3.5" />}
                    label={t("stats.nationality")}
                    value={`${player.nationality_flag as string} ${(player.nationality as string | null) ?? ""}`}
                  />
                )}
                {player.height_cm && (
                  <Stat
                    icon={<Ruler className="size-3.5" />}
                    label={t("stats.height")}
                    value={`${player.height_cm} cm`}
                  />
                )}
                {player.weight_kg && (
                  <Stat
                    icon={<Weight className="size-3.5" />}
                    label={t("stats.weight")}
                    value={`${player.weight_kg} kg`}
                  />
                )}
                {player.joined_club_at && (
                  <Stat
                    icon={<Calendar className="size-3.5" />}
                    label={t("stats.joined")}
                    value={dateFmt.format(new Date(player.joined_club_at as string))}
                  />
                )}
              </div>
              {player.instagram_handle && (
                <a
                  href={`https://instagram.com/${(player.instagram_handle as string).replace(/^@/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-pill border border-white/20 px-3 py-1.5 text-sm transition-colors hover:bg-white/10"
                >
                  <ExternalLink className="size-4" />
                  <span dir="ltr">
                    @{(player.instagram_handle as string).replace(/^@/, "")}
                  </span>
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Bio */}
        {bio && (
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-spo-ink">{t("bio.title")}</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-spo-ink-2">
              {bio}
            </p>
          </Card>
        )}

        {/* Previous clubs */}
        {previousClubs.length > 0 && (
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-spo-ink">
              {t("previousClubs.title")}
            </h2>
            <ul className="space-y-2">
              {previousClubs.map((entry, i) => (
                <li
                  key={`${entry.club}-${i}`}
                  className="flex items-center gap-3 border-b border-spo-line pb-2 last:border-0 last:pb-0"
                >
                  <Trophy className="size-3.5 text-spo-amber" aria-hidden="true" />
                  <span className="text-sm font-medium text-spo-ink">{entry.club}</span>
                  {entry.years && (
                    <span className="text-xs text-spo-muted">{entry.years}</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Empty-state fallback for sparse profiles */}
        {!bio && previousClubs.length === 0 && (
          <Card>
            <p className="text-center text-sm text-spo-muted">{t("empty")}</p>
          </Card>
        )}
      </div>
    </PublicShell>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md bg-white/5 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/50">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}
