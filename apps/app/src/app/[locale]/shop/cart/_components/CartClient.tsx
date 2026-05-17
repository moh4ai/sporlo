"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button, Card } from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

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

export function CartClient({ locale }: { locale: "ar" | "en" }) {
  const t = useTranslations("store.shop");
  const router = useRouter();
  const [cart, setCart] = useState<CartState | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const raw = sessionStorage.getItem(CART_KEY);
    if (raw) {
      try {
        setCart(JSON.parse(raw) as CartState);
      } catch {
        // Ignore malformed cart.
      }
    }
  }, []);

  const sarFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        style: "currency",
        currency: "SAR",
      }),
    [locale],
  );

  function persist(next: CartState | null) {
    setCart(next);
    if (!next || next.lines.length === 0) {
      sessionStorage.removeItem(CART_KEY);
    } else {
      sessionStorage.setItem(CART_KEY, JSON.stringify(next));
    }
  }

  function removeLine(variantId: string) {
    if (!cart) return;
    const lines = cart.lines.filter((l) => l.variant_id !== variantId);
    persist(lines.length === 0 ? null : { ...cart, lines });
  }

  if (!mounted) return null;
  if (!cart || cart.lines.length === 0) {
    return <p className="text-sm text-spo-muted">{t("cart.empty")}</p>;
  }

  const subtotal = cart.lines.reduce((acc, l) => acc + l.unit_price_sar * l.quantity, 0);

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {cart.lines.map((l) => (
          <li key={l.variant_id}>
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-spo-ink">{l.product_name}</h3>
                  {l.variant_label && (
                    <p className="text-xs text-spo-muted">{l.variant_label}</p>
                  )}
                  <p className="text-sm text-spo-ink-2">
                    {sarFmt.format(l.unit_price_sar)} × {l.quantity}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(l.variant_id)}
                  className="text-xs text-spo-danger hover:underline"
                >
                  {t("cart.remove")}
                </button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Card>
        <div className="flex items-center justify-between text-sm">
          <span className="text-spo-muted">{t("cart.subtotal")}</span>
          <span className="font-semibold">{sarFmt.format(subtotal)}</span>
        </div>
        <Button
          className="mt-3 w-full"
          onClick={() => router.push("/shop/checkout")}
        >
          {t("cart.checkout")}
        </Button>
      </Card>
    </div>
  );
}
