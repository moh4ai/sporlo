import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  GalleryItemsClient,
  type GalleryItemRow,
} from "./_components/GalleryItemsClient";

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "media" });
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data: gallery } = await supabase
    .from("media_galleries")
    .select("id, title_ar, title_en, published_at")
    .eq("id", id)
    .maybeSingle();
  if (!gallery) notFound();

  const { data: items } = await supabase
    .from("media_gallery_items")
    .select("id, image_path, caption_ar, caption_en, display_order")
    .eq("gallery_id", id)
    .order("display_order", { ascending: true });

  const rows: GalleryItemRow[] = (items ?? []).map((it) => {
    const { data: pub } = supabase.storage
      .from("media-galleries")
      .getPublicUrl(it.image_path as string);
    return {
      id: it.id as string,
      image_path: it.image_path as string,
      image_url: pub.publicUrl,
      caption_ar: (it.caption_ar as string | null) ?? "",
      caption_en: (it.caption_en as string | null) ?? "",
      display_order: (it.display_order as number) ?? 0,
    };
  });

  const title = locale === "ar" ? gallery.title_ar : gallery.title_en;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/media/galleries"
        className="text-sm text-spo-muted hover:text-spo-ink"
      >
        ← {t("galleries.backToList")}
      </Link>
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-spo-ink">{title}</h2>
        <p className="text-sm text-spo-muted">
          {gallery.published_at
            ? t("galleries.publishedHint")
            : t("galleries.draftHint")}
        </p>
      </header>

      <GalleryItemsClient
        galleryId={id}
        items={rows}
        principal={{ role: tenant.user_role, department: tenant.department }}
        locale={locale as "ar" | "en"}
      />
    </div>
  );
}
