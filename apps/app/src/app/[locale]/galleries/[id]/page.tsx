import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { PublicShell } from "@/components/PublicShell";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

export default async function PublicGalleryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "media" });

  const tenant = await resolvePublicTenant();
  if (!tenant) notFound();

  const admin = createServiceRoleClient();
  const nowIso = new Date().toISOString();
  const { data: gallery } = await admin
    .from("media_galleries")
    .select("id, title_ar, title_en, description_ar, description_en, published_at")
    .eq("id", id)
    .eq("org_id", tenant.org_id)
    .not("published_at", "is", null)
    .lte("published_at", nowIso)
    .maybeSingle();
  if (!gallery) notFound();

  const { data: items } = await admin
    .from("media_gallery_items")
    .select("id, image_path, caption_ar, caption_en, display_order")
    .eq("gallery_id", id)
    .order("display_order", { ascending: true });

  const title = locale === "ar" ? gallery.title_ar : gallery.title_en;
  const description =
    locale === "ar" ? gallery.description_ar : gallery.description_en;

  function imageUrl(path: string): string {
    return admin.storage.from("media-galleries").getPublicUrl(path).data.publicUrl;
  }

  return (
    <PublicShell locale={locale as Locale} tenant={tenant}>
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:px-6 sm:py-20">
        <Link
          href="/galleries"
          className="inline-flex items-center gap-1 text-sm text-spo-muted hover:text-spo-ink"
        >
          ← {t("galleries.backToList")}
        </Link>
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
            {t("galleries.eyebrow")}
          </p>
          <h1
            className="text-4xl font-semibold text-spo-ink sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h1>
          {description && (
            <p className="max-w-3xl text-base text-spo-ink-2">{description}</p>
          )}
        </header>

        {(!items || items.length === 0) ? (
          <p className="rounded-card border border-dashed border-spo-line p-8 text-center text-sm text-spo-muted">
            {t("galleries.noItemsYet")}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => {
              const caption =
                locale === "ar"
                  ? (it.caption_ar as string | null) ||
                    (it.caption_en as string | null) ||
                    ""
                  : (it.caption_en as string | null) ||
                    (it.caption_ar as string | null) ||
                    "";
              const url = imageUrl(it.image_path as string);
              return (
                <li
                  key={it.id as string}
                  className="group overflow-hidden rounded-card border border-spo-line bg-white transition-shadow hover:shadow-[var(--shadow-2)]"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-spo-paper">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={caption || (title as string)}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  {caption && (
                    <p className="p-3 text-xs text-spo-muted">{caption}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PublicShell>
  );
}
