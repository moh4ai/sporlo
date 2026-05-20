"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Select } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";

export interface ProductCardData {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  min_price: number | null;
  has_member_price: boolean;
  in_stock: boolean;
  low_stock: number | null;
  created_at: string;
}

type SortKey = "newest" | "priceAsc" | "priceDesc";

export function ShopFilters({
  products,
  categories,
  locale,
  defaultCategory,
}: {
  products: ProductCardData[];
  categories: string[];
  locale: "ar" | "en";
  defaultCategory: string | null;
}) {
  const t = useTranslations("store.shop");
  const [category, setCategory] = useState<string | null>(defaultCategory);
  const [sort, setSort] = useState<SortKey>("newest");

  const sarFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        style: "currency",
        currency: "SAR",
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const filtered = useMemo(() => {
    const inCategory =
      category == null
        ? products
        : products.filter((p) => p.category === category);
    const sorted = [...inCategory];
    if (sort === "priceAsc") {
      sorted.sort(
        (a, b) =>
          (a.min_price ?? Number.POSITIVE_INFINITY) -
          (b.min_price ?? Number.POSITIVE_INFINITY),
      );
    } else if (sort === "priceDesc") {
      sorted.sort(
        (a, b) =>
          (b.min_price ?? Number.NEGATIVE_INFINITY) -
          (a.min_price ?? Number.NEGATIVE_INFINITY),
      );
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return sorted;
  }, [products, category, sort]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-2">
          <li>
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={
                "inline-flex items-center rounded-pill border px-3 py-1 text-sm transition-colors " +
                (category == null
                  ? "border-spo-green bg-spo-green-soft text-spo-green-deep"
                  : "border-spo-line bg-white text-spo-ink-2 hover:bg-spo-paper")
              }
            >
              {t("filter.all")}
            </button>
          </li>
          {categories.map((c) => (
            <li key={c}>
              <button
                type="button"
                onClick={() => setCategory(c)}
                className={
                  "inline-flex items-center rounded-pill border px-3 py-1 text-sm transition-colors " +
                  (category === c
                    ? "border-spo-green bg-spo-green-soft text-spo-green-deep"
                    : "border-spo-line bg-white text-spo-ink-2 hover:bg-spo-paper")
                }
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="w-44"
          aria-label={t("filter.sortLabel")}
        >
          <option value="newest">{t("filter.sort.newest")}</option>
          <option value="priceAsc">{t("filter.sort.priceAsc")}</option>
          <option value="priceDesc">{t("filter.sort.priceDesc")}</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-spo-line bg-white p-8 text-center text-sm text-spo-muted">
          {t("filter.empty")}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link
                href={`/shop/${p.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-card border border-spo-line bg-white transition-all hover:-translate-y-0.5 hover:border-spo-green/40 hover:shadow-[var(--shadow-2)]"
              >
                <div className="relative aspect-square overflow-hidden bg-spo-paper-warm">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.name ?? ""}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="flex h-full w-full items-center justify-center text-3xl text-spo-green-deep/20 transition-transform duration-300 group-hover:scale-105"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {(p.name ?? "—").slice(0, 1)}
                    </div>
                  )}
                  {p.has_member_price && (
                    <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-pill bg-spo-green px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                      {t("badge.memberPrice")}
                    </span>
                  )}
                  {p.low_stock != null && (
                    <span className="absolute end-3 top-3 rounded-pill bg-spo-warning px-2 py-0.5 text-[10px] font-medium text-white">
                      {t("stock.only", { count: p.low_stock })}
                    </span>
                  )}
                  {!p.in_stock && (
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
                    {p.min_price != null ? sarFmt.format(p.min_price) : "—"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

