import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import { resolvePublicMediaSrc } from "@/lib/public-media";
import type { Locale } from "@/i18n/routing";

import { ProductsClient, type ProductRow } from "./_components/ProductsClient";

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name_ar, name_en, category, category_ar, category_en, active, image_path, image_paths, variants:product_variants(id, stock)",
    )
    .order("created_at", { ascending: false });

  const rows: ProductRow[] = (products ?? []).map((p) => {
    const variants = Array.isArray(p.variants) ? p.variants : [];
    const paths: string[] = Array.isArray(p.image_paths)
      ? (p.image_paths as string[])
      : [];
    const effectivePaths =
      paths.length > 0
        ? paths
        : p.image_path
          ? [p.image_path as string]
          : [];
    const images = effectivePaths
      .map((path) => ({
        path,
        url: resolvePublicMediaSrc(path, supabase, "product-images"),
      }))
      .filter((img): img is { path: string; url: string } => img.url != null);
    return {
      id: p.id,
      name_ar: p.name_ar,
      name_en: p.name_en,
      category: p.category,
      category_ar: (p.category_ar as string | null) ?? null,
      category_en: (p.category_en as string | null) ?? null,
      active: p.active,
      image_url: images[0]?.url ?? null,
      images,
      variant_count: variants.length,
      stock_total: variants.reduce((acc, v) => acc + Number(v.stock ?? 0), 0),
    };
  });

  return (
    <ProductsClient
      products={rows}
      principal={{ role: tenant.user_role, department: tenant.department }}
      locale={locale as "ar" | "en"}
    />
  );
}
