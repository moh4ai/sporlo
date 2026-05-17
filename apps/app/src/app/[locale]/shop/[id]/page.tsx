import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { createServiceRoleClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

import { AddToCartClient } from "./_components/AddToCartClient";

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
    .select("id, org_id, name_ar, name_en, description_ar, description_en, active")
    .eq("id", id)
    .maybeSingle();
  if (!product || !product.active) notFound();

  const { data: variants } = await admin
    .from("product_variants")
    .select("id, sku, size, color, price_sar, member_price_sar, stock, active")
    .eq("product_id", id)
    .eq("active", true);

  const name = locale === "ar" ? product.name_ar : product.name_en;
  const description = locale === "ar" ? product.description_ar : product.description_en;

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <Link href="/shop" className="text-sm text-spo-muted hover:text-spo-ink">
        ← {t("title")}
      </Link>
      <h1 className="text-2xl font-semibold text-spo-ink">{name}</h1>
      {description && <p className="text-sm text-spo-muted">{description}</p>}

      <Card>
        <AddToCartClient
          orgId={product.org_id}
          productId={product.id}
          productName={name}
          variants={(variants ?? []).map((v) => ({
            id: v.id,
            label: [v.size, v.color].filter(Boolean).join(" / ") || (v.sku ?? ""),
            price_sar: Number(v.price_sar),
            member_price_sar: v.member_price_sar != null ? Number(v.member_price_sar) : null,
            stock: Number(v.stock),
          }))}
          locale={locale as "ar" | "en"}
        />
      </Card>
    </main>
  );
}
