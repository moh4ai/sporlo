import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Accessibility, Calendar, Car, MapPin, Users } from "lucide-react";

import { Card } from "@sporlo/ui";

import { PublicShell } from "@/components/PublicShell";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

export default async function StadiumPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "stadium" });

  const tenant = await resolvePublicTenant();
  if (!tenant) notFound();

  const admin = createServiceRoleClient();
  const { data: info } = await admin
    .from("stadium_info")
    .select(
      "name_ar, name_en, address_ar, address_en, city_ar, city_en, capacity, opened_year, map_lat, map_lng, parking_notes_ar, parking_notes_en, accessibility_notes_ar, accessibility_notes_en, photo_path",
    )
    .eq("org_id", tenant.org_id)
    .maybeSingle();

  if (!info) notFound();

  const name = locale === "ar"
    ? (info.name_ar as string | null)
    : (info.name_en as string | null);
  const address = locale === "ar"
    ? (info.address_ar as string | null)
    : (info.address_en as string | null);
  const city = locale === "ar"
    ? (info.city_ar as string | null)
    : (info.city_en as string | null);
  const parking = locale === "ar"
    ? (info.parking_notes_ar as string | null)
    : (info.parking_notes_en as string | null);
  const accessibility = locale === "ar"
    ? (info.accessibility_notes_ar as string | null)
    : (info.accessibility_notes_en as string | null);

  const mapsHref =
    info.map_lat != null && info.map_lng != null
      ? `https://www.google.com/maps?q=${info.map_lat},${info.map_lng}`
      : null;

  const numberFmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB");

  return (
    <PublicShell locale={locale} tenant={tenant}>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
        {/* Hero */}
        <section className="overflow-hidden rounded-card-lg border border-spo-line bg-spo-ink text-white shadow-[var(--shadow-2)]">
          <div className="relative aspect-[21/9] bg-spo-green-soft/10">
            {info.photo_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={info.photo_path as string}
                alt={(name as string) ?? ""}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-[160px] font-bold text-white/10"
                style={{ fontFamily: "var(--font-display)" }}
              >
                ⛳
              </div>
            )}
          </div>
          <div className="space-y-2 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-soft/80">
              {t("eyebrow")}
            </p>
            <h1
              className="text-3xl font-semibold sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {name ?? t("untitled")}
            </h1>
            {address && (
              <p className="text-sm text-white/70">
                {address}
                {city ? ` — ${city}` : ""}
              </p>
            )}
            {mapsHref && (
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-pill border border-white/20 px-3 py-1.5 text-sm transition-colors hover:bg-white/10"
              >
                <MapPin className="size-4" />
                {t("openMap")}
              </a>
            )}
          </div>
        </section>

        {/* Stat tiles */}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {info.capacity && (
            <StatTile
              icon={<Users className="size-4" />}
              label={t("stats.capacity")}
              value={numberFmt.format(info.capacity as number)}
            />
          )}
          {info.opened_year && (
            <StatTile
              icon={<Calendar className="size-4" />}
              label={t("stats.opened")}
              value={String(info.opened_year)}
            />
          )}
          {parking && (
            <StatTile
              icon={<Car className="size-4" />}
              label={t("stats.parking")}
              value={t("stats.available")}
            />
          )}
          {accessibility && (
            <StatTile
              icon={<Accessibility className="size-4" />}
              label={t("stats.accessibility")}
              value={t("stats.available")}
            />
          )}
        </ul>

        {/* Notes */}
        {parking && (
          <Card>
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-spo-ink">
              <Car className="size-4 text-spo-green-deep" />
              {t("notes.parking")}
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-spo-ink-2">
              {parking}
            </p>
          </Card>
        )}
        {accessibility && (
          <Card>
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-spo-ink">
              <Accessibility className="size-4 text-spo-green-deep" />
              {t("notes.accessibility")}
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-spo-ink-2">
              {accessibility}
            </p>
          </Card>
        )}
      </div>
    </PublicShell>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <li className="rounded-card border border-spo-line bg-white p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-spo-muted">
        <span className="text-spo-green-deep">{icon}</span>
        {label}
      </p>
      <p
        className="mt-2 text-2xl font-semibold text-spo-ink"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
    </li>
  );
}
