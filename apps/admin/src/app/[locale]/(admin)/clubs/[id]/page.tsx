import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge, Card, CardHeader, CardTitle, Stat } from "@sporlo/ui";

import { ImpersonateButton } from "@/components/ImpersonateButton";
import { createServiceRoleClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "club" });
  const tClubs = await getTranslations({ locale, namespace: "clubs" });

  const admin = createServiceRoleClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, slug, name_ar, name_en, tier, subdomain, custom_domain, subscription_tier, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!org) notFound();

  const { count: memberCount } = await admin
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("org_id", id);

  const name = locale === "ar" ? org.name_ar : org.name_en;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/${locale}/clubs`}
        className="text-sm text-spo-muted hover:text-spo-ink"
      >
        ← {t("back")}
      </Link>

      <header className="space-y-1">
        <h1
          className="text-3xl font-semibold text-spo-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {name}
        </h1>
        <p className="text-sm text-spo-muted">
          <code className="rounded bg-spo-paper px-1.5 py-0.5 text-xs">
            {org.slug}
          </code>
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("members")} value={memberCount ?? 0} />
        <Stat
          label={t("tier")}
          value={
            <Badge tone={org.tier ? "green" : "neutral"}>
              {org.tier?.toUpperCase() ?? "—"}
            </Badge>
          }
        />
        <Stat
          label={t("createdAt")}
          value={new Date(org.created_at).toLocaleDateString(
            locale === "ar" ? "ar-SA" : "en-GB",
          )}
        />
      </div>

      <Card className="space-y-3">
        <CardHeader>
          <CardTitle>{tClubs("title")}</CardTitle>
        </CardHeader>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-spo-muted">
              {t("subdomain")}
            </dt>
            <dd className="text-spo-ink">{org.subdomain ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-spo-muted">
              {t("subscription")}
            </dt>
            <dd className="text-spo-ink">{org.subscription_tier}</dd>
          </div>
        </dl>
      </Card>

      <Card variant="warm" className="space-y-3">
        <CardHeader>
          <CardTitle>{t("impersonate")}</CardTitle>
        </CardHeader>
        <p className="text-sm text-spo-muted">{t("impersonateNote")}</p>
        <ImpersonateButton orgId={org.id} clubName={name} />
      </Card>
    </div>
  );
}
