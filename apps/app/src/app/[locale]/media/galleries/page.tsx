import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { PublicShell } from "@/components/PublicShell";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

export default async function PublicGalleriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "media" });

  const tenant = await resolvePublicTenant();
  if (!tenant) notFound();

  const admin = createServiceRoleClient();
  const nowIso = new Date().toISOString();
  const { data } = await admin
    .from("media_galleries")
    .select("id, title_ar, title_en, description_ar, description_en, cover_image_path, published_at")
    .eq("org_id", tenant.org_id)
    .not("published_at", "is", null)
    .lte("published_at", nowIso)
    .order("display_order", { ascending: true })
    .order("published_at", { ascending: false });

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  function coverUrl(path: string | null): string | null {
    if (!path) return null;
    return admin.storage.from("media-galleries").getPublicUrl(path).data.publicUrl;
  }

  return (
    <PublicShell locale={locale as Locale} tenant={tenant}>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <header className="space-y-1">
          <h1
            className="text-3xl font-semibold text-spo-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("galleries.publicTitle")}
          </h1>
          <p className="text-sm text-spo-muted">{t("galleries.publicSubtitle")}</p>
        </header>

        {(!data || data.length === 0) ? (
          <p className="rounded-card border border-dashed border-spo-line p-8 text-center text-sm text-spo-muted">
            {t("galleries.publicEmpty")}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((g) => {
              const url = coverUrl(g.cover_image_path as string | null);
              const title = locale === "ar" ? g.title_ar : g.title_en;
              return (
                <li key={g.id as string}>
                  <Link
                    href={`/media/galleries/${g.id}`}
                    className="group block overflow-hidden rounded-card border border-spo-line bg-white transition-shadow hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-spo-paper">
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={title as string}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-spo-muted">
                          {t("galleries.noCover")}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 p-3">
                      <h2 className="line-clamp-2 text-base font-medium text-spo-ink">
                        {title}
                      </h2>
                      {g.published_at && (
                        <p className="text-xs text-spo-muted">
                          {dateFmt.format(new Date(g.published_at as string))}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PublicShell>
  );
}
