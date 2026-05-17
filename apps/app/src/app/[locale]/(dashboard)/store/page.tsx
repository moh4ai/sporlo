import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
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
      "id, name_ar, name_en, category, active, variants:product_variants(id, stock)",
    )
    .order("created_at", { ascending: false });

  const rows: ProductRow[] = (products ?? []).map((p) => {
    const variants = Array.isArray(p.variants) ? p.variants : [];
    return {
      id: p.id,
      name_ar: p.name_ar,
      name_en: p.name_en,
      category: p.category,
      active: p.active,
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
