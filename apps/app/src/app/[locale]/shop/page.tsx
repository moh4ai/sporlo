import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShoppingBag } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { PublicShell } from "@/components/PublicShell";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

export default async function ShopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "store.shop" });

  const tenant = await resolvePublicTenant();
  const admin = createServiceRoleClient();
  let query = admin
    .from("products")
    .select(
      "id, name_ar, name_en, category, variants:product_variants(price_sar, stock, active)",
    )
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(60);
  if (tenant) query = query.eq("org_id", tenant.org_id);
  const { data } = await query;

  const sarFmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  });

  const products = (data ?? []).map((p) => {
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
    return {
      id: p.id,
      name: locale === "ar" ? p.name_ar : p.name_en,
      category: p.category as string | null,
      minPrice: prices.length > 0 ? Math.min(...prices) : null,
      inStock: stock > 0,
    };
  });

  return (
    <PublicShell locale={locale} tenant={tenant}>
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:px-6 sm:py-20">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
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
          </div>
          <Link
            href="/shop/cart"
            className="inline-flex items-center gap-1.5 rounded-pill border border-spo-line bg-white px-4 py-2 text-sm text-spo-ink-2 transition-colors hover:bg-spo-paper"
          >
            <ShoppingBag className="size-4" />
            {t("cart.title")}
          </Link>
        </header>

        {products.length === 0 ? (
          <div className="rounded-card border border-spo-line bg-white p-8 text-center text-sm text-spo-muted">
            {t("empty")}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/shop/${p.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-card border border-spo-line bg-white transition-all hover:-translate-y-0.5 hover:border-spo-green/40 hover:shadow-[var(--shadow-2)]"
                >
                  <div className="relative aspect-square overflow-hidden bg-spo-paper-warm">
                    <div
                      aria-hidden="true"
                      className="flex h-full w-full items-center justify-center text-3xl text-spo-green-deep/20 transition-transform duration-300 group-hover:scale-105"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {(p.name ?? "—").slice(0, 1)}
                    </div>
                    {!p.inStock && (
                      <span className="absolute end-3 top-3 rounded-pill bg-spo-ink/90 px-2 py-0.5 text-[10px] font-medium text-white">
                        {t("outOfStock")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-4">
                    {p.category && (
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-spo-muted">
                        {p.category}
                      </p>
                    )}
                    <h3 className="font-semibold text-spo-ink transition-colors group-hover:text-spo-green-deep">
                      {p.name}
                    </h3>
                    <p className="mt-auto text-base font-semibold text-spo-ink">
                      {p.minPrice != null ? sarFmt.format(p.minPrice) : "—"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PublicShell>
  );
}
