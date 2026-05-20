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

import { Link, useRouter } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";

import {
  createOrderIntent,
  lookupMemberDiscount,
} from "../../../(dashboard)/store/actions";

export function CheckoutClient({
  locale,
  moyasarConfigured,
}: {
  locale: "ar" | "en";
  moyasarConfigured: boolean;
}) {
  const t = useTranslations("store.shop.checkout");
  const ts = useTranslations("store.shop");
  const toast = useToast();
  const router = useRouter();
  const { cart, mounted, subtotalSar, clear } = useCart();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [method, setMethod] = useState<"moyasar" | "manual">(
    moyasarConfigured ? "moyasar" : "manual",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [memberDiscount, setMemberDiscount] = useState<number>(0);

  const sarFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        style: "currency",
        currency: "SAR",
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  // Look up member discount when the buyer types in an email.
  useEffect(() => {
    if (!cart || !email || !email.includes("@")) {
      setMemberDiscount(0);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await lookupMemberDiscount({
        org_id: cart.org_id,
        email,
      });
      if (cancelled) return;
      if (res.ok && res.data) {
        setMemberDiscount(res.data.discount_pct);
      } else {
        setMemberDiscount(0);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [email, cart]);

  if (!mounted) return null;
  if (!cart || cart.lines.length === 0) {
    return (
      <Card>
        <div className="space-y-4 py-4 text-center">
          <p className="text-sm text-spo-muted">{ts("cart.empty")}</p>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-pill bg-spo-green px-4 py-2 text-sm font-medium text-white hover:bg-spo-green-deep"
          >
            {ts("cart.continueShopping")}
          </Link>
        </div>
      </Card>
    );
  }

  const memberDiscountAmount =
    memberDiscount > 0
      ? Math.round((subtotalSar * memberDiscount) / 100)
      : 0;
  const projectedTotal = subtotalSar - memberDiscountAmount;

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
      buyer_name: name,
      buyer_email: email,
      buyer_phone: phone,
      shipping_address: address,
      payment_method: method,
    });
    setSubmitting(false);
    if (!res.ok) {
      if (res.error === "out-of-stock") setError(ts("outOfStock"));
      else setError(res.error);
      toast.push({ tone: "error", title: t("submit") });
      return;
    }
    clear();
    if (res.data.method === "moyasar") {
      router.push(
        `/shop/checkout/${res.data.payment_id}?email=${encodeURIComponent(email)}`,
      );
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
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormGroup label={t("buyerName")} required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </FormGroup>
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
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
              />
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
                <p className="mt-1 text-xs text-spo-muted">
                  {t("moyasarUnavailable")}
                </p>
              )}
            </FormGroup>

            {error && <p className="text-sm text-spo-danger">{error}</p>}

            <Button type="submit" disabled={submitting} className="w-full">
              {t("submit")}
            </Button>
          </form>
        </Card>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-spo-muted">
              {t("summaryTitle")}
            </h3>
            <ul className="space-y-3">
              {cart.lines.map((l) => (
                <li key={l.variant_id} className="flex items-start gap-3 text-sm">
                  <div className="size-12 shrink-0 overflow-hidden rounded-md border border-spo-line bg-spo-paper-warm">
                    {l.image_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={l.image_path}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-spo-ink">{l.product_name}</p>
                    {l.variant_label && (
                      <p className="text-xs text-spo-muted">{l.variant_label}</p>
                    )}
                    <p className="text-xs text-spo-muted">× {l.quantity}</p>
                  </div>
                  <span className="text-sm font-semibold text-spo-ink">
                    {sarFmt.format(l.unit_price_sar * l.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t border-spo-line pt-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-spo-muted">{ts("cart.subtotal")}</span>
                <span>{sarFmt.format(subtotalSar)}</span>
              </div>
              {memberDiscountAmount > 0 && (
                <div className="flex items-center justify-between text-spo-green-deep">
                  <span>{t("memberDiscountApplied")}</span>
                  <span>−{sarFmt.format(memberDiscountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 text-base font-semibold text-spo-ink">
                <span>{t("total")}</span>
                <span>{sarFmt.format(projectedTotal)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
