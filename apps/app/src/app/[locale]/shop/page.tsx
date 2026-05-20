import { getTranslations, setRequestLocale } from "next-intl/server";

import { PublicShell } from "@/components/PublicShell";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicMediaSrc } from "@/lib/public-media";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

import { ShopFilters, type ProductCardData } from "./_components/ShopFilters";

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "store.shop" });
  const sp = (await searchParams) ?? {};

  const tenant = await resolvePublicTenant();
  const admin = createServiceRoleClient();
  let query = admin
    .from("products")
    .select(
      "id, name_ar, name_en, category, image_path, image_paths, created_at, variants:product_variants(price_sar, member_price_sar, stock, active)",
    )
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(60);
  if (tenant) query = query.eq("org_id", tenant.org_id);
  const { data } = await query;

  const products: ProductCardData[] = (data ?? []).map((p) => {
    const variants = (Array.isArray(p.variants) ? p.variants : []).filter(
      (v: { active: boolean }) => v.active,
    );
    const prices = variants.map((v: { price_sar: number | string }) =>
      Number(v.price_sar),
    );
    const stock = variants.reduce(
      (acc: number, v: { stock: number }) => acc + Number(v.stock),
      0,
    );
    const hasMemberPrice = variants.some(
      (v: { member_price_sar: number | string | null }) =>
        v.member_price_sar != null,
    );
    const paths: string[] = Array.isArray(p.image_paths)
      ? (p.image_paths as string[])
      : [];
    const coverPath = paths[0] ?? (p.image_path as string | null) ?? null;
    return {
      id: p.id as string,
      name: locale === "ar" ? (p.name_ar as string) : (p.name_en as string),
      category: (p.category as string | null) ?? null,
      image_url: resolvePublicMediaSrc(coverPath, admin, "product-images"),
      min_price: prices.length > 0 ? Math.min(...prices) : null,
      has_member_price: hasMemberPrice,
      in_stock: stock > 0,
      low_stock: stock > 0 && stock <= 5 ? stock : null,
      created_at: (p.created_at as string) ?? new Date().toISOString(),
    };
  });

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter((c): c is string => !!c)),
  ).sort();

  return (
    <PublicShell locale={locale} tenant={tenant}>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-16 sm:px-6 sm:py-20">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
            {t("title")}
          </p>
          <h1
            className="text-4xl font-semibold text-spo-ink sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {tenant
              ? locale === "ar"
                ? tenant.name_ar
                : tenant.name_en
              : t("title")}
          </h1>
        </header>

        <ShopFilters
          products={products}
          categories={categories}
          locale={locale as "ar" | "en"}
          defaultCategory={sp.category ?? null}
        />
      </div>
    </PublicShell>
  );
}
