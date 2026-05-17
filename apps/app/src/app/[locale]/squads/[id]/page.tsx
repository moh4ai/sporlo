import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { createServiceRoleClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

export default async function PublicSquadDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "team.public" });

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
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/squads" className="text-sm text-spo-muted hover:text-spo-ink">
        ← {t("title")}
      </Link>
      <header className="space-y-1">
        <p className="text-xs uppercase text-spo-muted">{clubName}</p>
        <h1
          className="text-3xl font-semibold text-spo-ink"
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
          <p className="text-sm text-spo-muted">{t("noPlayers")}</p>
        ) : (
          <ul className="space-y-1">
            {roster.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between border-b border-spo-line py-2 last:border-0"
              >
                <div className="flex items-center gap-3">
                  {p.jersey_number != null && (
                    <code className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-spo-paper text-sm font-semibold">
                      {p.jersey_number}
                    </code>
                  )}
                  <span className="font-medium text-spo-ink">
                    {locale === "ar"
                      ? p.full_name_ar
                      : p.full_name_en || p.full_name_ar}
                  </span>
                </div>
                <span className="text-xs text-spo-muted">
                  {[p.position, p.nationality].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
