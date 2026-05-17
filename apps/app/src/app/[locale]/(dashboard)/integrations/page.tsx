import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { canPerform } from "@sporlo/auth";
import { CATALOG, CATEGORY_ORDER } from "@sporlo/integrations/catalog";
import type { IntegrationCategory } from "@sporlo/integrations";
import { Badge } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

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
  const { data: installed } = await supabase
    .from("org_integrations")
    .select("integration_slug, enabled");

  const installedSlugs = new Set(
    (installed ?? []).map((r) => r.integration_slug as string),
  );

  // Group catalog by category, preserve catalog ordering within each group.
  const grouped = new Map<IntegrationCategory, typeof CATALOG[number][]>();
  for (const entry of CATALOG) {
    const list = grouped.get(entry.category) ?? [];
    list.push(entry);
    grouped.set(entry.category, list);
  }

  return (
    <div className="space-y-8">
      {CATEGORY_ORDER.map((category) => {
        const entries = grouped.get(category);
        if (!entries || entries.length === 0) return null;
        return (
          <section key={category} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-spo-muted">
              {t(`categories.${category}`)}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => {
                const isInstalled = installedSlugs.has(entry.slug);
                const status = isInstalled
                  ? "installed"
                  : entry.availability === "available"
                    ? "available"
                    : "comingSoon";
                const tone =
                  status === "installed"
                    ? "green"
                    : status === "available"
                      ? "blue"
                      : "neutral";
                const statusLabel =
                  status === "installed"
                    ? t("status.installed")
                    : status === "available"
                      ? t("status.available")
                      : t("status.comingSoon");
                return (
                  <li key={entry.slug}>
                    <Link
                      href={`/integrations/${entry.slug}`}
                      className="block h-full rounded-card border border-spo-line bg-white p-4 transition-colors hover:border-spo-green hover:bg-spo-green-soft/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="text-base font-semibold text-spo-ink">
                            {locale === "ar" ? entry.name_ar : entry.name_en}
                          </div>
                          <p className="text-sm text-spo-muted">
                            {locale === "ar"
                              ? entry.short_description_ar
                              : entry.short_description_en}
                          </p>
                        </div>
                        <Badge tone={tone}>{statusLabel}</Badge>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
