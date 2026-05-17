"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button, Card, Input } from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { completeOnboarding } from "@/app/[locale]/onboarding/actions";

const DEPARTMENTS = [
  "finance",
  "hr",
  "marketing",
  "sports",
  "legal",
  "it",
  "academy",
  "events",
  "csr",
  "governance",
] as const;

const TOTAL_STEPS = 5;

export function OnboardingWizard({ locale }: { locale: "ar" | "en" }) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [primaryColor, setPrimaryColor] = useState<string>("");
  const [activeDepts, setActiveDepts] = useState<Set<string>>(
    new Set(["governance", "finance", "hr"]),
  );

  function toggleDept(d: string) {
    const next = new Set(activeDepts);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    setActiveDepts(next);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await completeOnboarding({
      slug: slug.trim().toLowerCase(),
      name_ar: nameAr,
      name_en: nameEn,
      primary_color: primaryColor || null,
      departments: Array.from(activeDepts),
    });
    if (!res.ok) {
      setSubmitting(false);
      setError(t("errorGeneric"));
      return;
    }
    // Force a token refresh so the hook re-fires with the new org_id + role.
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.refreshSession();
    setStep(5);
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1
          className="text-3xl font-semibold text-spo-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("title")}
        </h1>
        <p className="text-sm text-spo-muted">
          {t("stepCounter", { current: step, total: TOTAL_STEPS })}
        </p>
      </header>

      <Card className="space-y-4">
        {step === 1 && (
          <>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-spo-ink">
                {t("profile.title")}
              </h2>
              <p className="text-sm text-spo-muted">{t("profile.subtitle")}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm text-spo-ink-2">
                  {t("profile.nameAr")}
                </span>
                <Input
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  dir="rtl"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-spo-ink-2">
                  {t("profile.nameEn")}
                </span>
                <Input
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  dir="ltr"
                />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-sm text-spo-ink-2">{t("profile.slug")}</span>
              <Input
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  )
                }
                placeholder="alhilal"
                dir="ltr"
              />
              <span className="block text-xs text-spo-muted">
                {t("profile.slugHint")}
              </span>
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-spo-ink">
                {t("branding.title")}
              </h2>
              <p className="text-sm text-spo-muted">{t("branding.subtitle")}</p>
            </div>
            <label className="block space-y-1">
              <span className="text-sm text-spo-ink-2">
                {t("branding.primaryColor")}
              </span>
              <input
                type="color"
                value={primaryColor || "#0f6e3f"}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-11 w-24 cursor-pointer rounded-md border border-spo-line bg-white"
              />
            </label>
            <button
              type="button"
              onClick={() => setPrimaryColor("")}
              className="text-sm text-spo-muted hover:text-spo-ink-2"
            >
              {t("branding.skip")}
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-spo-ink">
                {t("departments.title")}
              </h2>
              <p className="text-sm text-spo-muted">
                {t("departments.subtitle")}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {DEPARTMENTS.map((d) => (
                <label
                  key={d}
                  className="flex items-center gap-2 rounded-xl border border-spo-line bg-white px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={activeDepts.has(d)}
                    onChange={() => toggleDept(d)}
                    className="h-4 w-4 accent-spo-green"
                  />
                  <span className="text-sm text-spo-ink-2">
                    {t(`departments.${d}`)}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-spo-ink">
                {t("users.title")}
              </h2>
              <p className="text-sm text-spo-muted">{t("users.subtitle")}</p>
            </div>
            <div className="rounded-xl bg-spo-green-soft p-4 text-sm text-spo-green-deep">
              {t("users.youAreAdmin")}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-spo-ink">
                {t("done.title")}
              </h2>
              <p className="text-sm text-spo-muted">{t("done.subtitle")}</p>
            </div>
          </>
        )}

        {error && <p className="text-sm text-spo-danger">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || submitting || step === 5}
          >
            {t("back")}
          </Button>
          {step < 4 && (
            <Button
              type="button"
              onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}
              disabled={
                (step === 1 && (!nameAr || !nameEn || slug.length < 3)) ||
                submitting
              }
            >
              {t("next")}
            </Button>
          )}
          {step === 4 && (
            <Button type="button" onClick={submit} disabled={submitting}>
              {t("finish")}
            </Button>
          )}
        </div>
      </Card>

      <span className="sr-only">{locale}</span>
    </div>
  );
}
