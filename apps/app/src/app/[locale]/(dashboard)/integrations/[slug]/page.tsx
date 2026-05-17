import { notFound, redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { canPerform } from "@sporlo/auth";
import { CATALOG } from "@sporlo/integrations/catalog";
import { Badge, Card } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import { IntegrationActions } from "../_components/IntegrationActions";

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);

  const entry = CATALOG.find((c) => c.slug === slug);
  if (!entry) notFound();

  const tenant = await getActiveTenant();
  const principal = { role: tenant.user_role, department: tenant.department };
  if (!canPerform(principal, "read", "integrations")) {
    redirect(`/${locale}`);
  }

  const t = await getTranslations({ locale, namespace: "integrations" });

  const supabase = await createSupabaseServerClient();
  const { data: install } = await supabase
    .from("org_integrations")
    .select("installed_at, installed_by")
    .eq("integration_slug", slug)
    .maybeSingle();

  let installedByName: string | null = null;
  if (install?.installed_by) {
    const { data: installer } = await supabase
      .from("users")
      .select("full_name_ar, full_name_en, email")
      .eq("id", install.installed_by)
      .maybeSingle();
    if (installer) {
      installedByName =
        (locale === "ar"
          ? (installer.full_name_ar as string | null)
          : (installer.full_name_en as string | null)) ??
        (installer.email as string | null) ??
        null;
    }
  }

  const canInstall = canPerform(principal, "create", "integration");
  const canUninstall = canPerform(principal, "delete", "integration");
  const isInstalled = install !== null;

  const status = isInstalled
    ? "installed"
    : entry.availability === "available"
      ? "available"
      : "comingSoon";
  const tone =
    status === "installed" ? "green" : status === "available" ? "blue" : "neutral";
  const statusLabel =
    status === "installed"
      ? t("status.installed")
      : status === "available"
        ? t("status.available")
        : t("status.comingSoon");

  return (
    <div className="space-y-6">
      <Link
        href="/integrations"
        className="text-sm text-spo-muted hover:text-spo-ink-2"
      >
        ← {t("actions.back")}
      </Link>

      <Card>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-spo-ink">
                {locale === "ar" ? entry.name_ar : entry.name_en}
              </h2>
              <p className="text-sm text-spo-muted">
                {t(`categories.${entry.category}`)}
              </p>
            </div>
            <Badge tone={tone}>{statusLabel}</Badge>
          </div>
          <p className="max-w-prose text-sm text-spo-ink-2">
            {locale === "ar"
              ? entry.short_description_ar
              : entry.short_description_en}
          </p>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-spo-ink">
            {t("detail.kindsHeading")}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {entry.kinds.map((kind) => (
              <li key={kind}>
                <Badge tone="neutral">{t(`kinds.${kind}`)}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-spo-ink">
            {t("detail.configHeading")}
          </h3>
          <p className="text-sm text-spo-muted">{t("detail.configHint")}</p>
          <p className="text-sm text-spo-ink-2">{t("detail.configEmpty")}</p>
        </div>
      </Card>

      {isInstalled && install?.installed_at && (
        <Card variant="warm">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-spo-ink">
              {t("detail.installedHeading")}
            </h3>
            <p className="text-sm text-spo-muted">
              {t("detail.installedHint", {
                when: new Date(install.installed_at).toLocaleDateString(
                  locale === "ar" ? "ar-SA" : "en-GB",
                  { year: "numeric", month: "short", day: "numeric" },
                ),
                who: installedByName ?? "—",
              })}
            </p>
          </div>
        </Card>
      )}

      {!isInstalled && entry.availability === "coming_soon" && (
        <p className="text-sm text-spo-muted">{t("detail.comingSoonHint")}</p>
      )}

      <IntegrationActions
        slug={entry.slug}
        isInstalled={isInstalled}
        canInstall={canInstall && entry.availability === "available"}
        canUninstall={canUninstall}
      />
    </div>
  );
}
