"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import {
  Button,
  Card,
  FormGroup,
  Input,
  Radio,
  Textarea,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import { createOrderIntent } from "../../../(dashboard)/store/actions";

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

export function CheckoutClient({
  locale,
  moyasarConfigured,
}: {
  locale: "ar" | "en";
  moyasarConfigured: boolean;
}) {
  const t = useTranslations("store.shop.checkout");
  const toast = useToast();
  const router = useRouter();
  const [cart, setCart] = useState<CartState | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [method, setMethod] = useState<"moyasar" | "manual">(
    moyasarConfigured ? "moyasar" : "manual",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(CART_KEY);
    if (raw) {
      try {
        setCart(JSON.parse(raw) as CartState);
      } catch {
        // ignore
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

  if (!cart || cart.lines.length === 0) {
    return (
      <Card>
        <p className="text-sm text-spo-muted">{t("submit")}</p>
      </Card>
    );
  }

  const subtotal = cart.lines.reduce((acc, l) => acc + l.unit_price_sar * l.quantity, 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cart) return;
    setError(null);
    setSubmitting(true);
    const res = await createOrderIntent({
      org_id: cart.org_id,
      lines: cart.lines.map((l) => ({
        variant_id: l.variant_id,
        quantity: l.quantity,
      })),
      buyer_email: email,
      buyer_phone: phone,
      shipping_address: address,
      payment_method: method,
    });
    setSubmitting(false);
    if (!res.ok) {
      if (res.error === "out-of-stock") setError(t("outOfStock"));
      else setError(res.error);
      toast.push({ tone: "error", title: t("submit") });
      return;
    }
    sessionStorage.removeItem(CART_KEY);
    if (res.data.method === "moyasar") {
      router.push(`/shop/checkout/${res.data.payment_id}?email=${encodeURIComponent(email)}`);
    } else {
      setConfirmation(t("successManual"));
      toast.push({ tone: "success", title: t("submit") });
    }
  }

  if (confirmation) {
    return (
      <Card variant="warm">
        <p className="text-sm text-spo-green-deep">{confirmation}</p>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        <ul className="space-y-1 text-sm">
          {cart.lines.map((l) => (
            <li key={l.variant_id} className="flex items-center justify-between">
              <span>
                {l.product_name}
                {l.variant_label && ` · ${l.variant_label}`}
              </span>
              <span className="text-spo-muted">
                {sarFmt.format(l.unit_price_sar * l.quantity)}
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between border-t border-spo-line pt-1 font-semibold">
            <span>{sarFmt.format(subtotal)}</span>
          </li>
        </ul>

        <FormGroup label={t("email")} hint={t("emailHint")} required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            required
          />
        </FormGroup>
        <FormGroup label={t("phone")}>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
        </FormGroup>
        <FormGroup label={t("address")} required>
          <Textarea
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </FormGroup>
        <FormGroup label={t("method")} required>
          <div className="flex flex-col gap-2">
            <Radio
              name="method"
              checked={method === "moyasar"}
              onChange={() => setMethod("moyasar")}
              disabled={!moyasarConfigured}
              label={t("methodMoyasar")}
            />
            <Radio
              name="method"
              checked={method === "manual"}
              onChange={() => setMethod("manual")}
              label={t("methodManual")}
            />
          </div>
          {!moyasarConfigured && (
            <p className="mt-1 text-xs text-spo-muted">{t("moyasarUnavailable")}</p>
          )}
        </FormGroup>

        {error && <p className="text-sm text-spo-danger">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {t("submit")}
        </Button>
      </form>
    </Card>
  );
}
