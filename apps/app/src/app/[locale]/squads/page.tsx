import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { createServiceRoleClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

export default async function PublicSquadsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "team.public" });

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("squads")
    .select(
      "id, name_ar, name_en, season, sport_type, organization:organizations(name_ar, name_en), roster:roster_entries(id, active)",
    )
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(60);

  const squads = (data ?? []).map((s) => {
    const org = Array.isArray(s.organization) ? s.organization[0] : s.organization;
    const roster = Array.isArray(s.roster) ? s.roster : [];
    return {
      id: s.id,
      name: locale === "ar" ? s.name_ar : s.name_en,
      season: s.season,
      sport: s.sport_type,
      clubName: locale === "ar" ? org?.name_ar : org?.name_en,
      players: roster.filter((r: { active: boolean }) => r.active).length,
    };
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-1">
        <h1
          className="text-3xl font-semibold text-spo-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("title")}
        </h1>
      </header>

      {squads.length === 0 ? (
        <Card>
          <p className="text-sm text-spo-muted">{t("empty")}</p>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {squads.map((s) => (
            <li key={s.id}>
              <Link href={`/squads/${s.id}`}>
                <Card className="h-full">
                  <p className="text-xs uppercase text-spo-muted">{s.clubName}</p>
                  <h3 className="mt-1 font-semibold text-spo-ink">{s.name}</h3>
                  <p className="mt-2 text-sm text-spo-ink-2">
                    {s.players} players · {s.sport}
                    {s.season && ` · ${s.season}`}
                  </p>
                  <p className="mt-2 text-sm text-spo-green-deep">{t("view")} →</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
