"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button, Card, FormGroup, Radio, useToast } from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

import { startMemberSubscription } from "../../actions";

export function CheckoutClient({
  locale,
  planCode,
  planName,
  priceSar,
  durationMonths,
  moyasarConfigured,
}: {
  locale: "ar" | "en";
  planCode: string;
  planName: string;
  priceSar: number;
  durationMonths: number;
  moyasarConfigured: boolean;
}) {
  const t = useTranslations("membershipCheckout");
  const router = useRouter();
  const toast = useToast();

  const [method, setMethod] = useState<"manual" | "moyasar">(
    moyasarConfigured ? "moyasar" : "manual",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        style: "currency",
        currency: "SAR",
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await startMemberSubscription({
      plan_code: planCode,
      payment_method: method,
    });

    if (!res.ok) {
      setSubmitting(false);
      const msg =
        res.error === "no-session"
          ? t("errors.noSession")
          : res.error === "no-tenant"
            ? t("errors.noTenant")
            : res.error === "plan-not-found" || res.error === "plan-not-available"
              ? t("errors.planUnavailable")
              : t("errors.generic");
      setError(msg);
      toast.push({ tone: "error", title: t("toast.failed") });
      return;
    }

    // Refresh the access token so the JWT picks up the new user_role=member
    // claim that the auth hook now populates. Without this, /me would bounce
    // the user straight back to /sign-in.
    const browserSb = createSupabaseBrowserClient();
    await browserSb.auth.refreshSession();

    if (res.data.method === "moyasar") {
      router.replace(`/membership/checkout/${res.data.payment_id}`);
    } else {
      toast.push({ tone: "success", title: t("toast.pendingManual") });
      router.replace("/me?paid=pending");
    }
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="rounded-card border border-spo-line bg-spo-paper-warm p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-spo-muted">
            {t("summary.label")}
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-spo-ink">{planName}</h2>
            <span
              className="text-2xl font-semibold text-spo-green-deep"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {fmt.format(priceSar)}
            </span>
          </div>
          <p className="text-xs text-spo-muted">
            {t("summary.duration", { count: durationMonths })}
          </p>
        </div>

        <FormGroup label={t("methodLabel")} required>
          <div className="flex flex-col gap-2">
            <Radio
              name="method"
              value="moyasar"
              checked={method === "moyasar"}
              onChange={() => setMethod("moyasar")}
              disabled={!moyasarConfigured}
              label={t("methodMoyasar")}
            />
            <Radio
              name="method"
              value="manual"
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
          {submitting ? t("submitting") : t("submit")}
        </Button>
      </form>
    </Card>
  );
}
