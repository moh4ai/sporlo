"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { Button, Drawer, QuantityStepper } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";

export function MiniCartDrawer({ locale }: { locale: "ar" | "en" }) {
  const t = useTranslations("store.shop");
  const {
    cart,
    miniCartOpen,
    closeMiniCart,
    updateQty,
    removeLine,
    subtotalSar,
    count,
  } = useCart();

  const sarFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        style: "currency",
        currency: "SAR",
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const lines = cart?.lines ?? [];

  return (
    <Drawer
      open={miniCartOpen}
      onClose={closeMiniCart}
      title={`${t("miniCart.title")} (${count})`}
      widthClassName="max-w-md"
    >
      {lines.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
          <p className="text-sm text-spo-muted">{t("miniCart.empty")}</p>
          <Button onClick={closeMiniCart} variant="ghost">
            {t("miniCart.continueShopping")}
          </Button>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <ul className="flex-1 space-y-4 overflow-y-auto">
            {lines.map((line) => (
              <li key={line.variant_id} className="flex gap-3">
                <div className="size-16 shrink-0 overflow-hidden rounded-md border border-spo-line bg-spo-paper-warm">
                  {line.image_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={line.image_path}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-xl text-spo-green-deep/30"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {line.product_name.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-spo-ink">
                      {line.product_name}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeLine(line.variant_id)}
                      aria-label={t("cart.remove")}
                      className="text-sm text-spo-muted hover:text-spo-danger"
                    >
                      ×
                    </button>
                  </div>
                  {line.variant_label && (
                    <p className="text-xs text-spo-muted">
                      {line.variant_label}
                    </p>
                  )}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <QuantityStepper
                      value={line.quantity}
                      onChange={(n) => updateQty(line.variant_id, n)}
                      min={1}
                      max={99}
                    />
                    <span className="text-sm font-semibold text-spo-ink">
                      {sarFmt.format(line.unit_price_sar * line.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="space-y-3 border-t border-spo-line pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-spo-muted">{t("cart.subtotal")}</span>
              <span className="text-lg font-semibold text-spo-ink">
                {sarFmt.format(subtotalSar)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/shop/cart"
                onClick={closeMiniCart}
                className="inline-flex items-center justify-center rounded-pill border border-spo-line bg-white px-4 py-2 text-sm text-spo-ink-2 hover:bg-spo-paper"
              >
                {t("miniCart.viewCart")}
              </Link>
              <Link
                href="/shop/checkout"
                onClick={closeMiniCart}
                className="inline-flex items-center justify-center rounded-pill bg-spo-green px-4 py-2 text-sm font-medium text-white hover:bg-spo-green-deep"
              >
                {t("cart.checkout")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
