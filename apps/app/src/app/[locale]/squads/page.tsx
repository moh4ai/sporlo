import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { PublicShell } from "@/components/PublicShell";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

export default async function PublicSquadsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "team.public" });

  const tenant = await resolvePublicTenant();
  const admin = createServiceRoleClient();
  let query = admin
    .from("squads")
    .select(
      "id, name_ar, name_en, season, sport_type, organization:organizations(name_ar, name_en), roster:roster_entries(id, active)",
    )
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(60);
  if (tenant) query = query.eq("org_id", tenant.org_id);
  const { data } = await query;

  const squads = (data ?? []).map((s) => {
    const org = Array.isArray(s.organization)
      ? s.organization[0]
      : s.organization;
    const roster = Array.isArray(s.roster) ? s.roster : [];
    return {
      id: s.id,
      name: locale === "ar" ? s.name_ar : s.name_en,
      season: s.season as string | null,
      sport: s.sport_type as string,
      clubName: locale === "ar" ? org?.name_ar : org?.name_en,
      players: roster.filter((r: { active: boolean }) => r.active).length,
    };
  });

  return (
    <PublicShell locale={locale} tenant={tenant}>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
            {t("title")}
          </p>
          <h1
            className="text-4xl font-semibold text-spo-ink sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {tenant
              ? locale === "ar"
                ? tenant.name_ar
                : tenant.name_en
              : t("title")}
          </h1>
        </header>

        {squads.length === 0 ? (
          <div className="rounded-card border border-spo-line bg-white p-8 text-center text-sm text-spo-muted">
            {t("empty")}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {squads.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/squads/${s.id}`}
                  className="group flex h-full flex-col gap-3 overflow-hidden rounded-card border border-spo-line bg-white p-6 transition-colors hover:border-spo-green/40"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-spo-muted">
                    {s.clubName}
                  </p>
                  <h3
                    className="text-2xl font-semibold text-spo-ink transition-colors group-hover:text-spo-green-deep"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {s.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-spo-muted">
                    <span className="rounded-pill bg-spo-green-soft px-2 py-0.5 font-medium text-spo-green-deep">
                      {s.players} {locale === "ar" ? "لاعب" : "players"}
                    </span>
                    <span>·</span>
                    <span>{s.sport}</span>
                    {s.season && (
                      <>
                        <span>·</span>
                        <span>{s.season}</span>
                      </>
                    )}
                  </div>
                  <p className="mt-auto text-sm font-medium text-spo-green-deep">
                    {t("view")} →
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PublicShell>
  );
}
