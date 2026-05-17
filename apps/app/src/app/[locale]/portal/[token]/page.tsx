import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";

import { Badge } from "@sporlo/ui";

import { PublicShell } from "@/components/PublicShell";
import { createServiceRoleClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

// Public member portal. Token-gated. Read-only — Phase 1.x will add the
// self-service freeze/cancel + downloadable member card.
export default async function PortalPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "memberships.portal" });

  const admin = createServiceRoleClient();

  const { data: tokenRow } = await admin
    .from("member_portal_tokens")
    .select("id, member_id, org_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow || new Date(tokenRow.expires_at) < new Date()) {
    return (
      <PublicShell locale={locale} minimal>
        <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
          <div className="rounded-card border border-spo-line bg-white p-6 text-center">
            <p className="text-sm text-spo-danger">{t("expiredOrInvalid")}</p>
          </div>
        </div>
      </PublicShell>
    );
  }

  const [{ data: member }, { data: org }] = await Promise.all([
    admin
      .from("members")
      .select("full_name_ar, full_name_en, member_number, email, status")
      .eq("id", tokenRow.member_id)
      .maybeSingle(),
    admin
      .from("organizations")
      .select("id, slug, name_ar, name_en")
      .eq("id", tokenRow.org_id)
      .maybeSingle(),
  ]);

  const memberName =
    locale === "ar"
      ? member?.full_name_ar
      : member?.full_name_en || member?.full_name_ar;

  const { data: subs } = await admin
    .from("subscriptions")
    .select(
      "id, status, starts_at, ends_at, plan:plans(name_ar, name_en, price_sar)",
    )
    .eq("member_id", tokenRow.member_id)
    .order("created_at", { ascending: false });

  const activeSub = subs?.find((s) => s.status === "active");
  const activePlan = activeSub
    ? Array.isArray(activeSub.plan)
      ? activeSub.plan[0]
      : activeSub.plan
    : null;
  const activePlanName = activePlan
    ? locale === "ar"
      ? activePlan.name_ar
      : activePlan.name_en
    : null;

  const { data: payments } = await admin
    .from("payments")
    .select("id, amount_sar, status, paid_at")
    .eq("member_id", tokenRow.member_id)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(10);

  const sarFmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  });
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const totalPaid =
    payments?.reduce((acc, p) => acc + Number(p.amount_sar), 0) ?? 0;

  const tenantForShell = org
    ? {
        org_id: org.id,
        slug: org.slug,
        name_ar: org.name_ar,
        name_en: org.name_en,
      }
    : null;

  return (
    <PublicShell locale={locale} tenant={tenantForShell} minimal>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        {/* Member ID hero card */}
        <div className="overflow-hidden rounded-card-lg border border-spo-green/30 bg-spo-ink text-white shadow-[var(--shadow-2)]">
          <div className="relative space-y-6 p-6 sm:p-8">
            <div
              aria-hidden="true"
              className="absolute -right-12 -top-12 size-48 rounded-full bg-spo-green/30 blur-3xl"
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-spo-green-soft/80">
                  {t("publicTitle")}
                </p>
                <p className="text-sm text-white/70">
                  {locale === "ar" ? org?.name_ar : org?.name_en}
                </p>
              </div>
              {activeSub ? (
                <Badge tone="green">{t("publicSubtitle") ?? "Active"}</Badge>
              ) : (
                <Badge tone="neutral">{t("noActiveSubscription")}</Badge>
              )}
            </div>
            <div className="relative space-y-1">
              <h1
                className="text-3xl font-semibold sm:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {memberName}
              </h1>
              {member?.member_number && (
                <p className="font-mono text-sm tracking-wider text-spo-green-soft">
                  {member.member_number}
                </p>
              )}
            </div>
            {activePlan && (
              <div className="relative grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/50">
                    {locale === "ar" ? "الباقة" : "Plan"}
                  </p>
                  <p className="mt-0.5 font-medium">{activePlanName}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/50">
                    {locale === "ar" ? "تنتهي" : "Expires"}
                  </p>
                  <p className="mt-0.5 font-medium">
                    {activeSub?.ends_at
                      ? dateFmt.format(new Date(activeSub.ends_at))
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/50">
                    {locale === "ar" ? "السعر" : "Price"}
                  </p>
                  <p className="mt-0.5 font-medium">
                    {activePlan.price_sar
                      ? sarFmt.format(Number(activePlan.price_sar))
                      : "—"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment timeline */}
        {payments && payments.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-spo-ink">
                {locale === "ar" ? "سجل المدفوعات" : "Payments"}
              </h2>
              <p className="text-xs text-spo-muted">
                {locale === "ar" ? "إجمالي" : "Total"} ·{" "}
                <span className="font-semibold text-spo-ink-2">
                  {sarFmt.format(totalPaid)}
                </span>
              </p>
            </div>
            <ol className="relative space-y-0">
              {payments.map((p, i) => (
                <li
                  key={p.id}
                  className="relative flex items-start gap-4 ps-7 pb-4 last:pb-0"
                >
                  {i !== payments.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute start-[11px] top-6 h-full w-px bg-spo-line"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute start-0 top-0.5 flex size-6 items-center justify-center rounded-full bg-spo-green-soft text-spo-green-deep"
                  >
                    <CheckCircle2 className="size-3.5" />
                  </span>
                  <div className="flex flex-1 items-center justify-between border-b border-spo-line pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-spo-ink">
                        {sarFmt.format(Number(p.amount_sar))}
                      </p>
                      <p className="text-xs text-spo-muted">
                        {p.paid_at ? dateFmt.format(new Date(p.paid_at)) : "—"}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </PublicShell>
  );
}
