import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { PublicShell } from "@/components/PublicShell";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

export default async function PublicSquadDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "team.public" });

  const tenant = await resolvePublicTenant();
  if (!tenant) notFound();
  const admin = createServiceRoleClient();
  const { data: squad } = await admin
    .from("squads")
    .select(
      "id, name_ar, name_en, season, sport_type, active, organization:organizations(name_ar, name_en)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!squad || !squad.active) notFound();

  const { data: roster } = await admin
    .from("roster_entries")
    .select(
      "id, full_name_ar, full_name_en, jersey_number, position, nationality",
    )
    .eq("squad_id", id)
    .eq("active", true)
    .order("jersey_number", { ascending: true, nullsFirst: false });

  const org = Array.isArray(squad.organization)
    ? squad.organization[0]
    : squad.organization;
  const clubName = locale === "ar" ? org?.name_ar : org?.name_en;
  const name = locale === "ar" ? squad.name_ar : squad.name_en;

  return (
    <PublicShell locale={locale as Locale} tenant={tenant}>
      <div className="mx-auto max-w-4xl space-y-10 px-4 py-16 sm:px-6 sm:py-20">
        <Link
          href="/squads"
          className="inline-flex items-center gap-1 text-sm text-spo-muted hover:text-spo-ink"
        >
          ← {t("title")}
        </Link>
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
            {clubName}
          </p>
          <h1
            className="text-4xl font-semibold text-spo-ink sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {name}
          </h1>
          {squad.season && (
            <p className="text-sm text-spo-muted">
              {t("season")}: {squad.season}
            </p>
          )}
        </header>

        <Card>
          {!roster || roster.length === 0 ? (
            <p className="py-4 text-sm text-spo-muted">{t("noPlayers")}</p>
          ) : (
            <ul className="divide-y divide-spo-line">
              {roster.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/squads/${id}/players/${p.id}`}
                    className="group flex items-center justify-between gap-3 py-3 transition-colors hover:bg-spo-paper/60"
                  >
                    <div className="flex items-center gap-3">
                      {p.jersey_number != null ? (
                        <code className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-spo-paper text-sm font-semibold text-spo-ink">
                          {p.jersey_number}
                        </code>
                      ) : (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-spo-paper text-xs text-spo-muted">
                          —
                        </span>
                      )}
                      <span className="font-medium text-spo-ink transition-colors group-hover:text-spo-green-deep">
                        {locale === "ar"
                          ? p.full_name_ar
                          : p.full_name_en || p.full_name_ar}
                      </span>
                    </div>
                    <span className="text-xs text-spo-muted">
                      {[p.position, p.nationality].filter(Boolean).join(" · ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PublicShell>
  );
}
