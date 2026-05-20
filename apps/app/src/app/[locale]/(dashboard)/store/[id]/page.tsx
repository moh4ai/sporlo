import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card, CardHeader, CardTitle } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

import { VariantsClient, type VariantRow } from "./_components/VariantsClient";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "store" });

  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name_ar, name_en, description_ar, description_en, category, active",
    )
    .eq("id", id)
    .maybeSingle();
  if (!product) notFound();

  const { data: variantsData } = await supabase
    .from("product_variants")
    .select(
      "id, sku, size, size_ar, size_en, color, color_ar, color_en, price_sar, member_price_sar, stock",
    )
    .eq("product_id", id)
    .order("created_at", { ascending: true });

  const variants: VariantRow[] = (variantsData ?? []).map((v) => ({
    id: v.id,
    sku: v.sku,
    size: v.size,
    size_ar: (v.size_ar as string | null) ?? null,
    size_en: (v.size_en as string | null) ?? null,
    color: v.color,
    color_ar: (v.color_ar as string | null) ?? null,
    color_en: (v.color_en as string | null) ?? null,
    price_sar: Number(v.price_sar),
    member_price_sar: v.member_price_sar != null ? Number(v.member_price_sar) : null,
    stock: Number(v.stock),
  }));

  const name = locale === "ar" ? product.name_ar : product.name_en;
  const description = locale === "ar" ? product.description_ar : product.description_en;

  return (
    <div className="space-y-6">
      <Link href="/store" className="text-sm text-spo-muted hover:text-spo-ink">
        ← {t("common.back")}
      </Link>

      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-spo-ink">{name}</h2>
        {description && <p className="text-sm text-spo-muted">{description}</p>}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("variants.title")}</CardTitle>
        </CardHeader>
        <VariantsClient productId={id} variants={variants} />
      </Card>
    </div>
  );
}
