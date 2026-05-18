import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { canPerform } from "@sporlo/auth";
import { CATALOG } from "@sporlo/integrations/catalog";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  IntegrationsCatalog,
  type CatalogEntryProps,
} from "./_components/IntegrationsCatalog";

export default async function IntegrationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tenant = await getActiveTenant();
  const principal = { role: tenant.user_role, department: tenant.department };
  if (!canPerform(principal, "read", "integrations")) {
    redirect(`/${locale}`);
  }

  const t = await getTranslations({ locale, namespace: "integrations" });

  const supabase = await createSupabaseServerClient();
  const [{ data: installed }, { data: pending }] = await Promise.all([
    supabase.from("org_integrations").select("integration_slug, enabled"),
    supabase
      .from("integration_requests")
      .select("integration_slug")
      .eq("status", "pending"),
  ]);

  const installedSlugs = (installed ?? []).map((r) => r.integration_slug as string);
  const pendingRequestSlugs = (pending ?? []).map(
    (r) => r.integration_slug as string,
  );

  // Pass the TS catalog directly — it's the source of truth for bilingual
  // labels (the DB seed is English-only).
  const entries: CatalogEntryProps[] = CATALOG.map((e) => ({
    slug: e.slug,
    name_ar: e.name_ar,
    name_en: e.name_en,
    category: e.category,
    short_description_ar: e.short_description_ar,
    short_description_en: e.short_description_en,
    kinds: e.kinds,
    availability: e.availability,
    simple_icon: e.simple_icon,
    brand_color: e.brand_color,
  }));

  const installedCount = installedSlugs.length;

  return (
    <div className="space-y-8">
      {/* Marketplace hero */}
      <section className="rounded-card-lg border border-spo-line bg-gradient-to-br from-spo-green-soft to-white p-6 sm:p-8">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
            {t("hero.eyebrow")}
          </p>
          <h2
            className="text-2xl font-semibold text-spo-ink sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("hero.headline", { count: entries.length })}
          </h2>
          <p className="text-sm text-spo-ink-2">{t("hero.body")}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-spo-muted">
          <span>
            <strong className="text-spo-ink">{entries.length}</strong>{" "}
            {t("hero.statTotal")}
          </span>
          <span>·</span>
          <span>
            <strong className="text-spo-ink">{installedCount}</strong>{" "}
            {t("hero.statInstalled")}
          </span>
        </div>
      </section>

      <IntegrationsCatalog
        entries={entries}
        installedSlugs={installedSlugs}
        pendingRequestSlugs={pendingRequestSlugs}
        locale={locale as "ar" | "en"}
      />
    </div>
  );
}
