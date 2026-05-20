"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { Button, Card, QuantityStepper } from "@sporlo/ui";

import { Link, useRouter } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";

export function CartClient({ locale }: { locale: "ar" | "en" }) {
  const t = useTranslations("store.shop");
  const router = useRouter();
  const { cart, mounted, subtotalSar, updateQty, removeLine } = useCart();

  const sarFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        style: "currency",
        currency: "SAR",
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  if (!mounted) return null;
  if (!cart || cart.lines.length === 0) {
    return (
      <Card>
        <div className="space-y-4 py-4 text-center">
          <p className="text-sm text-spo-muted">{t("cart.empty")}</p>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-pill bg-spo-green px-4 py-2 text-sm font-medium text-white hover:bg-spo-green-deep"
          >
            {t("cart.continueShopping")}
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <ul className="space-y-3 lg:col-span-2">
        {cart.lines.map((l) => (
          <li key={l.variant_id}>
            <Card>
              <div className="flex items-start gap-4">
                <div className="size-20 shrink-0 overflow-hidden rounded-md border border-spo-line bg-spo-paper-warm">
                  {l.image_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.image_path}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-2xl text-spo-green-deep/30"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {l.product_name.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/shop/${l.product_id}`}
                      className="font-medium text-spo-ink hover:text-spo-green-deep"
                    >
                      {l.product_name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeLine(l.variant_id)}
                      className="text-xs text-spo-danger hover:underline"
                    >
                      {t("cart.remove")}
                    </button>
                  </div>
                  {l.variant_label && (
                    <p className="text-xs text-spo-muted">{l.variant_label}</p>
                  )}
                  <p className="text-sm text-spo-ink-2">
                    {sarFmt.format(l.unit_price_sar)}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <QuantityStepper
                      value={l.quantity}
                      onChange={(n) => updateQty(l.variant_id, n)}
                      min={1}
                      max={99}
                    />
                    <span className="font-semibold text-spo-ink">
                      {sarFmt.format(l.unit_price_sar * l.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </li>
        ))}
        <li>
          <Link
            href="/shop"
            className="inline-flex items-center gap-1 text-sm text-spo-muted hover:text-spo-ink"
          >
            ← {t("cart.continueShopping")}
          </Link>
        </li>
      </ul>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-spo-muted">
              {t("checkout.summaryTitle")}
            </h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-spo-muted">{t("cart.subtotal")}</span>
              <span className="font-semibold">{sarFmt.format(subtotalSar)}</span>
            </div>
            <Button
              className="w-full"
              onClick={() => router.push("/shop/checkout")}
            >
              {t("cart.checkout")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
