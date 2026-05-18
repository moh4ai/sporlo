import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PublicShell } from "@/components/PublicShell";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

export default async function PublicHospitalityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "hospitality" });

  const tenant = await resolvePublicTenant();
  if (!tenant) notFound();

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("hospitality_packages")
    .select(
      "id, name_ar, name_en, body_ar, body_en, price_sar, capacity, cover_image_path, fixture_filter, contact_url, display_order",
    )
    .eq("org_id", tenant.org_id)
    .eq("active", true)
    .order("display_order", { ascending: true });

  const sarFmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  });

  function coverUrl(path: string | null): string | null {
    if (!path) return null;
    return admin.storage.from("hospitality-covers").getPublicUrl(path).data
      .publicUrl;
  }

  return (
    <PublicShell locale={locale as Locale} tenant={tenant}>
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:px-6 sm:py-20">
        <header className="max-w-3xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
            {t("eyebrow")}
          </p>
          <h1
            className="text-4xl font-semibold text-spo-ink sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("publicTitle")}
          </h1>
          <p className="text-base text-spo-ink-2">{t("publicSubtitle")}</p>
        </header>

        {(!data || data.length === 0) ? (
          <p className="rounded-card border border-dashed border-spo-line p-8 text-center text-sm text-spo-muted">
            {t("publicEmpty")}
          </p>
        ) : (
          <ul className="grid gap-5 lg:grid-cols-2">
            {data.map((p) => {
              const name = locale === "ar" ? p.name_ar : p.name_en;
              const body = locale === "ar" ? p.body_ar : p.body_en;
              const url = coverUrl(p.cover_image_path as string | null);
              return (
                <li
                  key={p.id as string}
                  className="group overflow-hidden rounded-card border border-spo-line bg-white transition-all hover:-translate-y-0.5 hover:border-spo-green/40 hover:shadow-[var(--shadow-2)]"
                >
                  {url && (
                    <div className="aspect-[16/9] w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={name as string}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="space-y-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="text-xl font-semibold text-spo-ink">
                        {name}
                      </h2>
                      <span className="rounded-pill bg-spo-green-soft px-3 py-1 text-sm font-medium text-spo-green-deep">
                        {sarFmt.format(Number(p.price_sar))}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-spo-muted">
                      <span className="rounded-pill bg-spo-paper px-2 py-0.5">
                        {t(`filter.${p.fixture_filter}`)}
                      </span>
                      {p.capacity != null && (
                        <span className="rounded-pill bg-spo-paper px-2 py-0.5">
                          {t("capacityLabel", { count: p.capacity as number })}
                        </span>
                      )}
                    </div>
                    {body && (
                      <p className="whitespace-pre-line text-sm text-spo-ink-2">
                        {body}
                      </p>
                    )}
                    {p.contact_url && (
                      <a
                        href={p.contact_url as string}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-pill bg-spo-green-deep px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-spo-green"
                      >
                        {t("inquire")} →
                      </a>
                    )}
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
