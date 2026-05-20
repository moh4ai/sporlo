import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Alert, Breadcrumb } from "@sporlo/ui";

import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicMediaSrc } from "@/lib/public-media";
import { detectPublicMember } from "@/lib/public-member";
import { hasMemberDiscount } from "@/lib/store-pricing";
import type { Locale } from "@/i18n/routing";

import { AddToCartClient } from "./_components/AddToCartClient";
import { ProductGallery } from "./_components/ProductGallery";

export default async function ProductDetailPublicPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "store.shop" });

  const admin = createServiceRoleClient();
  const { data: product } = await admin
    .from("products")
    .select(
      "id, org_id, name_ar, name_en, description_ar, description_en, category, category_ar, category_en, image_path, image_paths, active",
    )
    .eq("id", id)
    .maybeSingle();
  if (!product || !product.active) notFound();

  const { data: variants } = await admin
    .from("product_variants")
    .select(
      "id, sku, size, size_ar, size_en, color, color_ar, color_en, price_sar, member_price_sar, stock, active",
    )
    .eq("product_id", id)
    .eq("active", true);

  const member = await detectPublicMember(product.org_id as string);
  const isMember = member != null;
  const planDiscountPct = member?.plan_discount_pct ?? 0;

  const name = locale === "ar" ? product.name_ar : product.name_en;
  const description = locale === "ar" ? product.description_ar : product.description_en;
  const category =
    locale === "ar"
      ? ((product.category_ar as string | null) ??
        (product.category_en as string | null) ??
        (product.category as string | null))
      : ((product.category_en as string | null) ??
        (product.category as string | null) ??
        (product.category_ar as string | null));

  const rawPaths: string[] = Array.isArray(product.image_paths)
    ? (product.image_paths as string[])
    : [];
  const effectivePaths =
    rawPaths.length > 0
      ? rawPaths
      : product.image_path
        ? [product.image_path as string]
        : [];
  const galleryUrls = effectivePaths
    .map((path) => resolvePublicMediaSrc(path, admin, "product-images"))
    .filter((url): url is string => url != null);
  const coverPath = effectivePaths[0] ?? null;

  const mappedVariants = (variants ?? []).map((v) => {
    const sizeLocalized =
      locale === "ar"
        ? ((v.size_ar as string | null) ??
          (v.size_en as string | null) ??
          (v.size as string | null))
        : ((v.size_en as string | null) ??
          (v.size as string | null) ??
          (v.size_ar as string | null));
    const colorLocalized =
      locale === "ar"
        ? ((v.color_ar as string | null) ??
          (v.color_en as string | null) ??
          (v.color as string | null))
        : ((v.color_en as string | null) ??
          (v.color as string | null) ??
          (v.color_ar as string | null));
    return {
      id: v.id,
      sku: (v.sku as string | null) ?? null,
      size: (v.size as string | null) ?? null,
      color: (v.color as string | null) ?? null,
      sizeLabel: sizeLocalized,
      colorLabel: colorLocalized,
      label:
        [sizeLocalized, colorLocalized].filter(Boolean).join(" / ") ||
        (v.sku as string | null) ||
        "",
      price_sar: Number(v.price_sar),
      member_price_sar:
        v.member_price_sar != null ? Number(v.member_price_sar) : null,
      stock: Number(v.stock),
    };
  });
  const showMemberBanner =
    !isMember &&
    mappedVariants.some((v) => hasMemberDiscount(v, planDiscountPct));

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <Breadcrumb
        items={[
          { label: t("breadcrumb"), href: `/${locale}/shop` },
          ...(category
            ? [
                {
                  label: category,
                  href: `/${locale}/shop?category=${encodeURIComponent(category)}`,
                },
              ]
            : []),
          { label: name, current: true },
        ]}
        separator={locale === "ar" ? "›" : "/"}
      />

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ProductGallery images={galleryUrls} alt={name} />
        </div>

        <div className="lg:sticky lg:top-6 lg:col-span-5 lg:self-start">
          <div className="space-y-5 rounded-card border border-spo-line bg-white p-5 shadow-[var(--shadow-1)]">
            {category && (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-spo-muted">
                {category}
              </p>
            )}
            <h1 className="text-3xl font-semibold text-spo-ink sm:text-4xl">
              {name}
            </h1>
            {description && (
              <p className="text-sm leading-relaxed text-spo-ink-2 whitespace-pre-line">
                {description}
              </p>
            )}

            {showMemberBanner && (
              <Alert tone="info" title={t("detail.memberBannerTitle")}>
                {t("detail.memberBannerBody")}
              </Alert>
            )}

            <AddToCartClient
              orgId={product.org_id as string}
              productId={product.id as string}
              productName={name}
              productCoverPath={coverPath}
              variants={mappedVariants}
              isMember={isMember}
              planDiscountPct={planDiscountPct}
              locale={locale as "ar" | "en"}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
