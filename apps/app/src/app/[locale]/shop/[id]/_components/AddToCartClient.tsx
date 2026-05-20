"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import {
  Badge,
  Button,
  QuantityStepper,
  SwatchGroup,
  useToast,
} from "@sporlo/ui";

import { useCart } from "@/lib/cart";
import {
  effectiveUnitPrice,
  hasMemberDiscount,
} from "@/lib/store-pricing";

export interface VariantOption {
  id: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  label: string;
  price_sar: number;
  member_price_sar: number | null;
  stock: number;
}

function unique<T>(arr: (T | null | undefined)[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const v of arr) {
    if (v == null) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function StockNote({
  stock,
  t,
}: {
  stock: number;
  t: ReturnType<typeof useTranslations>;
}) {
  if (stock <= 0) {
    return <p className="text-sm font-medium text-spo-danger">{t("stock.outOfStock")}</p>;
  }
  if (stock <= 5) {
    return (
      <p className="text-sm font-medium text-spo-warning">
        {t("stock.only", { count: stock })}
      </p>
    );
  }
  if (stock <= 10) {
    return <p className="text-sm text-spo-muted">{t("stock.limited")}</p>;
  }
  return null;
}

export function AddToCartClient({
  orgId,
  productId,
  productName,
  productCoverPath,
  variants,
  isMember,
  planDiscountPct,
  locale,
}: {
  orgId: string;
  productId: string;
  productName: string;
  productCoverPath: string | null;
  variants: VariantOption[];
  isMember: boolean;
  planDiscountPct: number;
  locale: "ar" | "en";
}) {
  const t = useTranslations("store.shop");
  const toast = useToast();
  const cart = useCart();

  const sizes = useMemo(() => unique(variants.map((v) => v.size)), [variants]);
  const colors = useMemo(() => unique(variants.map((v) => v.color)), [variants]);

  // Initial selection: first variant with stock, else first variant.
  const initial = useMemo(() => {
    const inStock = variants.find((v) => v.stock > 0);
    return inStock ?? variants[0] ?? null;
  }, [variants]);

  const [selectedSize, setSelectedSize] = useState<string | null>(
    initial?.size ?? null,
  );
  const [selectedColor, setSelectedColor] = useState<string | null>(
    initial?.color ?? null,
  );
  const [quantity, setQuantity] = useState(1);

  // Resolve the variant the buyer is choosing:
  //   - exact match if both axes are picked
  //   - matches-size-only if no color exists for this product
  //   - matches-color-only if no size exists
  //   - the sole variant if neither axis exists
  const selected = useMemo<VariantOption | null>(() => {
    if (variants.length === 1) return variants[0]!;
    return (
      variants.find(
        (v) =>
          (sizes.length === 0 || v.size === selectedSize) &&
          (colors.length === 0 || v.color === selectedColor),
      ) ?? null
    );
  }, [variants, sizes.length, colors.length, selectedSize, selectedColor]);

  // A size/colour chip is enabled if any variant with that value has
  // stock > 0 AND matches the other axis (when an axis is selected).
  const sizeOptions = useMemo(
    () =>
      sizes.map((size) => ({
        value: size,
        label: size,
        disabled: !variants.some(
          (v) =>
            v.size === size &&
            v.stock > 0 &&
            (selectedColor == null || v.color === selectedColor),
        ),
      })),
    [sizes, variants, selectedColor],
  );
  const colorOptions = useMemo(
    () =>
      colors.map((color) => ({
        value: color,
        label: color,
        disabled: !variants.some(
          (v) =>
            v.color === color &&
            v.stock > 0 &&
            (selectedSize == null || v.size === selectedSize),
        ),
      })),
    [colors, variants, selectedSize],
  );

  const sarFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        style: "currency",
        currency: "SAR",
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const allOutOfStock = variants.every((v) => v.stock <= 0);
  const stock = selected?.stock ?? 0;
  const showsDiscount =
    selected != null && hasMemberDiscount(selected, planDiscountPct);
  const displayPrice =
    selected != null
      ? effectiveUnitPrice({
          basePrice: selected.price_sar,
          memberOverride: selected.member_price_sar,
          planDiscountPct,
          isMember,
        })
      : null;
  const memberPrice =
    selected != null
      ? effectiveUnitPrice({
          basePrice: selected.price_sar,
          memberOverride: selected.member_price_sar,
          planDiscountPct,
          isMember: true,
        })
      : null;

  function onAdd() {
    if (!selected || selected.stock <= 0) return;
    const qty = Math.min(quantity, selected.stock);
    cart.addLine({
      org_id: orgId,
      variant_id: selected.id,
      product_id: productId,
      product_name: productName,
      variant_label: selected.label || null,
      unit_price_sar: selected.price_sar,
      image_path: productCoverPath,
      quantity: qty,
    });
    toast.push({ tone: "success", title: t("cart.addedToast") });
    cart.openMiniCart();
  }

  if (allOutOfStock) {
    return <p className="text-sm font-medium text-spo-danger">{t("outOfStock")}</p>;
  }

  return (
    <div className="space-y-4">
      {sizes.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-spo-muted">
            {t("variant.size")}
          </label>
          <SwatchGroup
            options={sizeOptions}
            value={selectedSize}
            onChange={setSelectedSize}
            ariaLabel={t("variant.size")}
          />
        </div>
      )}
      {colors.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-spo-muted">
            {t("variant.color")}
          </label>
          <SwatchGroup
            options={colorOptions}
            value={selectedColor}
            onChange={setSelectedColor}
            ariaLabel={t("variant.color")}
          />
        </div>
      )}

      {!selected && (
        <p className="rounded-md border border-spo-line bg-spo-paper-warm px-3 py-2 text-sm text-spo-ink-2">
          {t("detail.unavailableCombo")}
        </p>
      )}

      {selected && displayPrice != null && (
        <div className="space-y-1">
          <div className="flex flex-wrap items-end gap-3">
            <span className="text-3xl font-semibold text-spo-ink">
              {sarFmt.format(displayPrice)}
            </span>
            {showsDiscount && !isMember && memberPrice != null && (
              <span className="inline-flex items-center gap-1.5 text-sm">
                <Badge tone="green">{t("badge.memberPrice")}</Badge>
                <span className="text-spo-green-deep">
                  {sarFmt.format(memberPrice)}
                </span>
              </span>
            )}
            {showsDiscount && isMember && (
              <span className="inline-flex items-center gap-1.5 text-sm">
                <Badge tone="green">{t("badge.memberPrice")}</Badge>
                <span className="text-spo-muted line-through">
                  {sarFmt.format(selected.price_sar)}
                </span>
              </span>
            )}
          </div>
          <StockNote stock={stock} t={t} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          min={1}
          max={Math.max(1, stock)}
          ariaLabel={t("variant.quantity")}
        />
        <Button
          onClick={onAdd}
          disabled={!selected || stock <= 0}
          className="min-w-40"
        >
          {t("addToCart")}
        </Button>
      </div>
    </div>
  );
}
