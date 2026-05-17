"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import {
  Button,
  Card,
  FormGroup,
  Input,
  Radio,
  Select,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import { startSubscription } from "../../../../actions";

type PlanOption = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  price_sar: number;
  duration_months: number;
};

export function SubscribeClient({
  memberId,
  plans,
  locale,
  moyasarConfigured,
}: {
  memberId: string;
  plans: PlanOption[];
  locale: "ar" | "en";
  moyasarConfigured: boolean;
}) {
  const t = useTranslations("memberships");
  const router = useRouter();
  const toast = useToast();

  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [coupon, setCoupon] = useState("");
  const [method, setMethod] = useState<"manual" | "moyasar">("manual");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        style: "currency",
        currency: "SAR",
      }),
    [locale],
  );

  if (plans.length === 0) {
    return (
      <Card>
        <p className="text-sm text-spo-muted">{t("subscriptions.subscribe.noActivePlans")}</p>
      </Card>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await startSubscription({
      member_id: memberId,
      plan_id: planId,
      payment_method: method,
      coupon_code: coupon,
    });
    setSubmitting(false);
    if (!res.ok) {
      const msg =
        res.error === "plan-not-found"
          ? t("subscriptions.errors.planNotFound")
          : res.error === "plan-archived"
            ? t("subscriptions.errors.planArchived")
            : res.error === "coupon-invalid"
              ? t("subscriptions.errors.couponInvalid")
              : res.error === "coupon-expired"
                ? t("subscriptions.errors.couponExpired")
                : res.error === "coupon-exhausted"
                  ? t("subscriptions.errors.couponExhausted")
                  : t("plans.errors.invalid");
      setError(msg);
      toast.push({ tone: "error", title: t("toast.saveFailed") });
      return;
    }
    toast.push({ tone: "success", title: t("toast.subscriptionStarted") });
    if (res.data.method === "moyasar") {
      router.replace(
        `/memberships/members/${memberId}/checkout/${res.data.payment_id}`,
      );
    } else {
      router.replace(`/memberships/members/${memberId}`);
    }
    router.refresh();
  }

  const selectedPlan = plans.find((p) => p.id === planId);

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormGroup label={t("subscriptions.subscribe.selectPlan")} required>
          <Select value={planId} onChange={(e) => setPlanId(e.target.value)} required>
            {plans.map((p) => {
              const name = locale === "ar" ? p.name_ar : p.name_en;
              return (
                <option key={p.id} value={p.id}>
                  {name} — {fmt.format(p.price_sar)} / {p.duration_months}m
                </option>
              );
            })}
          </Select>
        </FormGroup>

        <FormGroup label={t("subscriptions.subscribe.couponLabel")}>
          <Input
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            dir="ltr"
            maxLength={40}
          />
        </FormGroup>

        <FormGroup label={t("subscriptions.subscribe.methodLabel")} required>
          <div className="flex flex-col gap-2">
            <Radio
              name="method"
              value="manual"
              checked={method === "manual"}
              onChange={() => setMethod("manual")}
              label={t("subscriptions.subscribe.methodManual")}
            />
            <Radio
              name="method"
              value="moyasar"
              checked={method === "moyasar"}
              onChange={() => setMethod("moyasar")}
              disabled={!moyasarConfigured}
              label={t("subscriptions.subscribe.methodMoyasar")}
            />
          </div>
          {!moyasarConfigured && (
            <p className="mt-1 text-xs text-spo-muted">
              {t("subscriptions.subscribe.moyasarUnavailable")}
            </p>
          )}
        </FormGroup>

        {selectedPlan && (
          <p className="text-sm text-spo-ink-2">
            {fmt.format(selectedPlan.price_sar)} · {selectedPlan.duration_months}m
          </p>
        )}

        {error && <p className="text-sm text-spo-danger">{error}</p>}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting || !planId}>
            {t("subscriptions.subscribe.submit")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
