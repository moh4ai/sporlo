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

import { createTicketIntent } from "../../../../(dashboard)/events/actions";

type SectionOption = {
  id: string;
  label: string;
  capacity: number;
  price_sar: number | null;
};

export function BuyClient({
  fixtureId,
  sections,
  locale,
  moyasarConfigured,
}: {
  fixtureId: string;
  sections: SectionOption[];
  locale: "ar" | "en";
  moyasarConfigured: boolean;
}) {
  const t = useTranslations("events.publicBuy");
  const toast = useToast();
  const router = useRouter();

  const sellable = sections.filter((s) => s.price_sar != null);
  const [sectionId, setSectionId] = useState(sellable[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"manual" | "moyasar">(
    moyasarConfigured ? "moyasar" : "manual",
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        style: "currency",
        currency: "SAR",
      }),
    [locale],
  );

  if (sellable.length === 0) {
    return (
      <Card>
        <p className="text-sm text-spo-muted">{t("noPricing")}</p>
      </Card>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await createTicketIntent({
      fixture_id: fixtureId,
      section_id: sectionId,
      quantity: Number(quantity),
      buyer_email: email,
      buyer_phone: phone,
      payment_method: method,
    });
    setSubmitting(false);
    if (!res.ok) {
      if (res.error === "not-enough-seats") setError(t("noSeats"));
      else if (res.error === "pricing-not-set") setError(t("noPricing"));
      else setError(res.error);
      toast.push({ tone: "error", title: t("submit") });
      return;
    }
    if (res.data.method === "moyasar") {
      // Redirect to checkout page that mounts Moyasar Forms.
      router.push(
        `/fixtures/${fixtureId}/checkout/${res.data.payment_id}?email=${encodeURIComponent(email)}`,
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
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormGroup label={t("section")} required>
          <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            {sellable.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} — {s.price_sar != null ? fmt.format(s.price_sar) : "—"}
              </option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup label={t("quantity")} required>
          <Input
            type="number"
            min={1}
            max={10}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            dir="ltr"
            required
          />
        </FormGroup>

        <FormGroup label={t("email")} required>
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
