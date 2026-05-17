import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { PublicShell } from "@/components/PublicShell";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

export default async function PublicFixturesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "events.publicListing" });

  const tenant = await resolvePublicTenant();
  const admin = createServiceRoleClient();
  let query = admin
    .from("fixtures")
    .select(
      "id, opponent_ar, opponent_en, kickoff_at, venue, status, organization:organizations(name_ar, name_en, slug)",
    )
    .in("status", ["scheduled", "in_progress"])
    .gte("kickoff_at", new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
    .order("kickoff_at", { ascending: true })
    .limit(50);
  // When on a club subdomain, restrict to that tenant's fixtures.
  if (tenant) query = query.eq("org_id", tenant.org_id);

  const { data } = await query;

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
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

        {!data || data.length === 0 ? (
          <div className="rounded-card border border-spo-line bg-white p-8 text-center text-sm text-spo-muted">
            {t("empty")}
          </div>
        ) : (
          <ul className="space-y-3">
            {data.map((f) => {
              const org = Array.isArray(f.organization)
                ? f.organization[0]
                : f.organization;
              const orgName = locale === "ar" ? org?.name_ar : org?.name_en;
              const opp = locale === "ar" ? f.opponent_ar : f.opponent_en;
              const kickoff = new Date(f.kickoff_at);
              const isLive = f.status === "in_progress";
              return (
                <li key={f.id}>
                  <div className="group overflow-hidden rounded-card border border-spo-line bg-white transition-colors hover:border-spo-green/40">
                    <div className="grid items-stretch gap-0 sm:grid-cols-[150px_1fr_auto]">
                      {/* Date / time block */}
                      <div className="flex flex-col items-center justify-center border-b border-spo-line bg-spo-paper-warm px-4 py-4 sm:border-b-0 sm:border-e">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-spo-muted">
                          {dateFmt.format(kickoff)}
                        </span>
                        <span
                          className="mt-1 text-2xl font-semibold text-spo-ink"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {timeFmt.format(kickoff)}
                        </span>
                        {isLive && (
                          <Badge tone="danger" className="mt-2">
                            LIVE
                          </Badge>
                        )}
                      </div>
                      {/* Match block */}
                      <div className="flex flex-col justify-center gap-1 px-5 py-4">
                        <p className="text-xs uppercase tracking-wide text-spo-muted">
                          {orgName}
                        </p>
                        <h3
                          className="text-xl font-semibold text-spo-ink"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {orgName}{" "}
                          <span className="text-spo-muted">vs</span> {opp}
                        </h3>
                        {f.venue && (
                          <p className="text-sm text-spo-muted">{f.venue}</p>
                        )}
                      </div>
                      {/* CTA */}
                      <div className="flex items-center justify-center border-t border-spo-line p-4 sm:border-s sm:border-t-0">
                        <Link
                          href={`/fixtures/${f.id}/buy`}
                          className="inline-flex items-center justify-center rounded-pill bg-spo-green px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-spo-green-deep"
                        >
                          {t("buy")}
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PublicShell>
  );
}
