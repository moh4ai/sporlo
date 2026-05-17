import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge, Card } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { createServiceRoleClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

// Public listing — anyone can browse upcoming fixtures. Uses service-role
// to read across orgs by default; future Phase 4 work scopes by the active
// tenant cookie when on a club subdomain.
export default async function PublicFixturesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "events.publicListing" });

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("fixtures")
    .select("id, opponent_ar, opponent_en, kickoff_at, venue, status, organization:organizations(name_ar, name_en, slug)")
    .in("status", ["scheduled", "in_progress"])
    .gte("kickoff_at", new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
    .order("kickoff_at", { ascending: true })
    .limit(50);

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1
          className="text-3xl font-semibold text-spo-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("title")}
        </h1>
      </header>

      {(!data || data.length === 0) ? (
        <Card>
          <p className="text-sm text-spo-muted">{t("empty")}</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {data.map((f) => {
            const org = Array.isArray(f.organization)
              ? f.organization[0]
              : f.organization;
            const orgName = locale === "ar" ? org?.name_ar : org?.name_en;
            const opp = locale === "ar" ? f.opponent_ar : f.opponent_en;
            return (
              <Card key={f.id} className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-spo-ink">
                    {orgName} <span className="text-spo-muted">vs</span> {opp}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-spo-muted">
                    <span>{dateFmt.format(new Date(f.kickoff_at))}</span>
                    {f.venue && <span>· {f.venue}</span>}
                    {f.status === "in_progress" && <Badge tone="blue">Live</Badge>}
                  </div>
                </div>
                <Link
                  href={`/fixtures/${f.id}/buy`}
                  className="rounded-pill bg-spo-green px-4 py-2 text-sm font-medium text-white hover:bg-spo-green-deep"
                >
                  {t("buy")}
                </Link>
              </Card>
            );
          })}
        </ul>
      )}
    </main>
  );
}
