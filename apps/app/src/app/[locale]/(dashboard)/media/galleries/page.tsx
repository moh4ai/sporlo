import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import { GalleriesClient, type GalleryRow } from "./_components/GalleriesClient";

export default async function GalleriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data: galleries } = await supabase
    .from("media_galleries")
    .select(
      "id, title_ar, title_en, description_ar, description_en, cover_image_path, display_order, published_at, created_at",
    )
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  // Item counts per gallery (single round-trip via aggregate).
  const galleryIds = (galleries ?? []).map((g) => g.id as string);
  const itemCounts = new Map<string, number>();
  if (galleryIds.length > 0) {
    const { data: items } = await supabase
      .from("media_gallery_items")
      .select("gallery_id")
      .in("gallery_id", galleryIds);
    for (const item of items ?? []) {
      const gid = item.gallery_id as string;
      itemCounts.set(gid, (itemCounts.get(gid) ?? 0) + 1);
    }
  }

  const rows: GalleryRow[] = (galleries ?? []).map((g) => ({
    id: g.id as string,
    title_ar: g.title_ar as string,
    title_en: g.title_en as string,
    description_ar: (g.description_ar as string | null) ?? null,
    description_en: (g.description_en as string | null) ?? null,
    cover_image_path: (g.cover_image_path as string | null) ?? null,
    display_order: (g.display_order as number) ?? 0,
    published_at: (g.published_at as string | null) ?? null,
    item_count: itemCounts.get(g.id as string) ?? 0,
  }));

  return (
    <GalleriesClient
      galleries={rows}
      principal={{ role: tenant.user_role, department: tenant.department }}
      locale={locale as "ar" | "en"}
    />
  );
}
