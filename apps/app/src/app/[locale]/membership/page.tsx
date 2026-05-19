import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, Sparkles } from "lucide-react";

import { Button } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { PublicShell } from "@/components/PublicShell";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

type BenefitLine = { ar?: string; en?: string };

export default async function MembershipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "membershipTiers" });

  const tenant = await resolvePublicTenant();
  if (!tenant) notFound();

  const admin = createServiceRoleClient();
  const { data: plans } = await admin
    .from("plans")
    .select(
      "id, code, name_ar, name_en, price_sar, duration_months, benefits_jsonb",
    )
    .eq("org_id", tenant.org_id)
    .eq("public_visible", true)
    .eq("active", true)
    .order("price_sar", { ascending: true });

  if (!plans || plans.length === 0) notFound();

  const sarFmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  });

  // The middle tier (by price) gets the "Most popular" badge if there are
  // at least 3 tiers. A small heuristic that mirrors how every Saudi Pro
  // League site we studied calls out a default tier.
  const popularIdx = plans.length >= 3 ? Math.floor(plans.length / 2) : -1;

  return (
    <PublicShell locale={locale} tenant={tenant}>
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-16 sm:px-6 sm:py-20">
        <header className="mx-auto max-w-2xl space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
            {t("eyebrow")}
          </p>
          <h1
            className="text-4xl font-semibold text-spo-ink sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("title")}
          </h1>
          <p className="text-spo-muted">{t("subtitle")}</p>
        </header>

        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, idx) => {
            const name =
              locale === "ar"
                ? (plan.name_ar as string)
                : (plan.name_en as string);
            const benefits = Array.isArray(plan.benefits_jsonb)
              ? (plan.benefits_jsonb as BenefitLine[])
              : [];
            const isPopular = idx === popularIdx;
            return (
              <li key={plan.id}>
                <article
                  className={
                    "group flex h-full flex-col gap-5 rounded-card-lg border p-6 transition-all hover:-translate-y-0.5 " +
                    (isPopular
                      ? "border-spo-green bg-spo-green-soft/20 shadow-[var(--shadow-2)] hover:shadow-[var(--shadow-3)]"
                      : "border-spo-line bg-white hover:border-spo-green/40 hover:shadow-[var(--shadow-2)]")
                  }
                >
                  <header className="space-y-1">
                    {isPopular && (
                      <span className="inline-flex items-center gap-1 rounded-pill bg-spo-green px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                        <Sparkles className="size-3" />
                        {t("popular")}
                      </span>
                    )}
                    <h2
                      className="text-2xl font-semibold text-spo-ink sm:text-3xl"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {name}
                    </h2>
                    <p className="text-xs uppercase tracking-wider text-spo-muted">
                      {plan.code}
                    </p>
                  </header>
                  <div>
                    <p className="flex items-baseline gap-1">
                      <span
                        className="text-4xl font-semibold text-spo-ink sm:text-5xl"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {sarFmt.format(Number(plan.price_sar))}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-spo-muted">
                      {t("perDuration", {
                        count: plan.duration_months as number,
                      })}
                    </p>
                  </div>
                  {benefits.length > 0 && (
                    <ul className="flex-1 space-y-2 text-sm">
                      {benefits.map((b, i) => {
                        const line =
                          locale === "ar"
                            ? b.ar ?? b.en ?? ""
                            : b.en ?? b.ar ?? "";
                        if (!line) return null;
                        return (
                          <li key={i} className="flex gap-2">
                            <Check className="mt-0.5 size-4 shrink-0 text-spo-green-deep" />
                            <span className="text-spo-ink-2">{line}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <Link href={`/sign-in?plan=${plan.code}`} className="block">
                    <Button
                      className="w-full"
                      variant={isPopular ? "primary" : "secondary"}
                    >
                      {t("cta")}
                    </Button>
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>

        <footer className="rounded-card border border-spo-line bg-spo-paper-warm p-6 text-center">
          <p className="text-sm text-spo-muted">{t("footerNote")}</p>
        </footer>
      </div>
    </PublicShell>
  );
}
