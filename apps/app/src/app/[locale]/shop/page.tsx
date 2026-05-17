import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { createServiceRoleClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

export default async function ShopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "store.shop" });

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("products")
    .select(
      "id, name_ar, name_en, category, variants:product_variants(price_sar, stock, active)",
    )
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(60);

  const sarFmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  });

  const products = (data ?? []).map((p) => {
    const variants = (Array.isArray(p.variants) ? p.variants : []).filter(
      (v: { active: boolean }) => v.active,
    );
    const prices = variants.map((v: { price_sar: number | string }) => Number(v.price_sar));
    const stock = variants.reduce((acc: number, v: { stock: number }) => acc + Number(v.stock), 0);
    return {
      id: p.id,
      name: locale === "ar" ? p.name_ar : p.name_en,
      category: p.category,
      minPrice: prices.length > 0 ? Math.min(...prices) : null,
      inStock: stock > 0,
    };
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1
          className="text-3xl font-semibold text-spo-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("title")}
        </h1>
        <Link
          href="/shop/cart"
          className="rounded-pill border border-spo-line bg-white px-3 py-1.5 text-sm hover:bg-spo-paper"
        >
          {t("cart.title")}
        </Link>
      </header>

      {products.length === 0 ? (
        <Card>
          <p className="text-sm text-spo-muted">{t("empty")}</p>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id}>
              <Link href={`/shop/${p.id}`} className="block">
                <Card className="h-full">
                  <h3 className="font-semibold text-spo-ink">{p.name}</h3>
                  {p.category && (
                    <p className="text-xs uppercase text-spo-muted">{p.category}</p>
                  )}
                  <p className="mt-2 text-spo-ink-2">
                    {p.minPrice != null ? `${sarFmt.format(p.minPrice)}+` : "—"}
                  </p>
                  {!p.inStock && (
                    <p className="mt-1 text-xs text-spo-danger">{t("outOfStock")}</p>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
