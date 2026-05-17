"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button, Input, Select, useToast } from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

export interface VariantOption {
  id: string;
  label: string;
  price_sar: number;
  member_price_sar: number | null;
  stock: number;
}

interface CartLine {
  org_id: string;
  variant_id: string;
  product_id: string;
  product_name: string;
  variant_label: string | null;
  unit_price_sar: number;
  quantity: number;
}

interface CartState {
  org_id: string;
  lines: CartLine[];
}

const CART_KEY = "sporlo-shop-cart";

function readCart(): CartState | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(CART_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CartState;
  } catch {
    return null;
  }
}

function writeCart(state: CartState | null) {
  if (typeof sessionStorage === "undefined") return;
  if (!state) {
    sessionStorage.removeItem(CART_KEY);
  } else {
    sessionStorage.setItem(CART_KEY, JSON.stringify(state));
  }
}

export function AddToCartClient({
  orgId,
  productId,
  productName,
  variants,
  locale,
}: {
  orgId: string;
  productId: string;
  productName: string;
  variants: VariantOption[];
  locale: "ar" | "en";
}) {
  const t = useTranslations("store.shop");
  const toast = useToast();
  const router = useRouter();
  const [variantId, setVariantId] = useState(variants.find((v) => v.stock > 0)?.id ?? variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");

  const sarFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        style: "currency",
        currency: "SAR",
      }),
    [locale],
  );

  const selected = variants.find((v) => v.id === variantId) ?? null;
  const sellable = variants.filter((v) => v.stock > 0);

  if (sellable.length === 0) {
    return <p className="text-sm text-spo-danger">{t("outOfStock")}</p>;
  }

  function addToCart() {
    if (!selected) return;
    const qty = Math.max(1, Math.min(Number(quantity), selected.stock));
    const existing = readCart();
    const cart: CartState =
      existing && existing.org_id === orgId
        ? existing
        : { org_id: orgId, lines: [] };

    const found = cart.lines.find((l) => l.variant_id === selected.id);
    if (found) {
      found.quantity = Math.min(selected.stock, found.quantity + qty);
    } else {
      cart.lines.push({
        org_id: orgId,
        variant_id: selected.id,
        product_id: productId,
        product_name: productName,
        variant_label: selected.label || null,
        unit_price_sar: selected.price_sar,
        quantity: qty,
      });
    }
    writeCart(cart);
    toast.push({ tone: "success", title: t("addToCart") });
    router.push("/shop/cart");
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={variantId} onChange={(e) => setVariantId(e.target.value)}>
          {sellable.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label || v.id.slice(0, 6)} — {sarFmt.format(v.price_sar)}
            </option>
          ))}
        </Select>
        <Input
          type="number"
          min={1}
          max={selected?.stock ?? 1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          dir="ltr"
        />
      </div>
      {selected?.member_price_sar != null && (
        <p className="text-xs text-spo-muted">
          {t("memberDiscount")}: {sarFmt.format(selected.member_price_sar)}
        </p>
      )}
      <Button onClick={addToCart} className="w-full">
        {t("addToCart")}
      </Button>
    </div>
  );
}
