import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge, Card, Table, THead, TBody, TR, TH, TD } from "@sporlo/ui";

import { createServiceRoleClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

export default async function ClubsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "clubs" });

  const admin = createServiceRoleClient();

  // Pull every org plus a count of its members. We aggregate client-side because
  // PostgREST's count semantics inside a join can be quirky on small data sets.
  const { data: orgs } = await admin
    .from("organizations")
    .select("id, slug, name_ar, name_en, tier, created_at")
    .neq("slug", "sporlo-hq")
    .order("created_at", { ascending: false });

  const orgIds = (orgs ?? []).map((o) => o.id);
  const counts: Record<string, number> = {};
  if (orgIds.length > 0) {
    const { data: members } = await admin
      .from("members")
      .select("org_id")
      .in("org_id", orgIds);
    for (const row of members ?? []) {
      counts[row.org_id as string] = (counts[row.org_id as string] ?? 0) + 1;
    }
  }

  const displayName = (o: { name_ar: string; name_en: string }) =>
    locale === "ar" ? o.name_ar : o.name_en;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1
          className="text-3xl font-semibold text-spo-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("title")}
        </h1>
        <p className="text-sm text-spo-muted">{t("subtitle")}</p>
      </header>

      {!orgs || orgs.length === 0 ? (
        <Card>
          <p className="text-sm text-spo-muted">{t("empty")}</p>
        </Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{t("headerName")}</TH>
              <TH>{t("headerSlug")}</TH>
              <TH>{t("tier")}</TH>
              <TH>{t("headerMembers")}</TH>
              <TH>{t("headerCreated")}</TH>
              <TH>{t("headerActions")}</TH>
            </TR>
          </THead>
          <TBody>
            {orgs.map((o) => (
              <TR key={o.id}>
                <TD className="font-medium">{displayName(o)}</TD>
                <TD>
                  <code className="rounded bg-spo-paper px-1.5 py-0.5 text-xs">
                    {o.slug}
                  </code>
                </TD>
                <TD>
                  {o.tier ? (
                    <Badge tone="green">{o.tier.toUpperCase()}</Badge>
                  ) : (
                    <Badge tone="neutral">—</Badge>
                  )}
                </TD>
                <TD>{counts[o.id] ?? 0}</TD>
                <TD className="text-xs text-spo-muted">
                  {new Date(o.created_at).toLocaleDateString(
                    locale === "ar" ? "ar-SA" : "en-GB",
                  )}
                </TD>
                <TD>
                  <Link
                    href={`/${locale}/clubs/${o.id}`}
                    className="text-sm text-spo-green-deep hover:underline"
                  >
                    {t("open")}
                  </Link>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
