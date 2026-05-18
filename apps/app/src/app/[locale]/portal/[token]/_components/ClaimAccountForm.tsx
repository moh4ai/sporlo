"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button, FormGroup, Input, useToast } from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import { claimPortalAccount } from "../actions";

export function ClaimAccountForm({
  token,
  defaultEmail,
}: {
  token: string;
  defaultEmail: string | null;
}) {
  const t = useTranslations("claimAccount");
  const toast = useToast();
  const router = useRouter();

  const [email, setEmail] = useState(defaultEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) {
      setErr(t("errors.passwordMismatch"));
      return;
    }
    if (password.length < 8) {
      setErr(t("errors.passwordTooShort"));
      return;
    }
    setSubmitting(true);
    const res = await claimPortalAccount({ token, email, password });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.claimed") });
      router.replace("/sign-in");
    } else {
      const msg =
        res.error === "expired-token"
          ? t("errors.expired")
          : res.error === "invalid-token"
            ? t("errors.invalid")
            : res.error === "already-claimed"
              ? t("errors.alreadyClaimed")
              : res.error;
      setErr(msg);
    }
  }

  return (
    <section className="rounded-card-lg border border-spo-line bg-white p-6 shadow-sm sm:p-8">
      <header className="mb-4 space-y-1">
        <h2
          className="text-xl font-semibold text-spo-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("title")}
        </h2>
        <p className="text-sm text-spo-muted">{t("subtitle")}</p>
      </header>
      <form onSubmit={submit} className="space-y-4">
        <FormGroup label={t("fields.email")} required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            required
            autoComplete="email"
          />
        </FormGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("fields.password")} required>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              dir="ltr"
            />
          </FormGroup>
          <FormGroup label={t("fields.confirm")} required>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              dir="ltr"
            />
          </FormGroup>
        </div>
        {err && <p className="text-sm text-spo-danger">{err}</p>}
        <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? t("submitting") : t("submit")}
        </Button>
      </form>
    </section>
  );
}
