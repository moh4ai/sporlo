import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PublicShell } from "@/components/PublicShell";
import { createServiceRoleClient, createSupabaseServerClient } from "@/lib/supabase-server";
import { moyasarPublishableKey } from "@/lib/moyasar";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

import { CheckoutClient } from "./_components/CheckoutClient";

export default async function MembershipCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { locale } = await params;
  const { plan: planCode } = await searchParams;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "membershipCheckout" });

  if (!planCode) redirect(`/${locale}/membership`);

  const tenant = await resolvePublicTenant();
  if (!tenant) notFound();

  // Gate on session — if not signed in, bounce to sign-in carrying plan code
  // so the flow resumes after auth.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/sign-in?plan=${encodeURIComponent(planCode)}`);
  }

  const admin = createServiceRoleClient();
  const { data: plan } = await admin
    .from("plans")
    .select("id, code, name_ar, name_en, price_sar, duration_months, benefits_jsonb")
    .eq("org_id", tenant.org_id)
    .eq("code", planCode)
    .eq("public_visible", true)
    .eq("active", true)
    .maybeSingle();
  if (!plan) notFound();

  const planName = locale === "ar" ? (plan.name_ar as string) : (plan.name_en as string);
  const moyasarConfigured = moyasarPublishableKey() !== null;

  return (
    <PublicShell locale={locale as Locale} tenant={tenant}>
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-16 sm:px-6 sm:py-20">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
            {t("eyebrow")}
          </p>
          <h1
            className="text-3xl font-semibold text-spo-ink sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("title", { plan: planName })}
          </h1>
          <p className="text-spo-muted">{t("subtitle")}</p>
        </header>

        <CheckoutClient
          locale={locale as "ar" | "en"}
          planCode={plan.code as string}
          planName={planName}
          priceSar={Number(plan.price_sar)}
          durationMonths={plan.duration_months as number}
          moyasarConfigured={moyasarConfigured}
        />
      </div>
    </PublicShell>
  );
}
