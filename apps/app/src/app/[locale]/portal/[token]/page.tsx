import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge, Card, CardHeader, CardTitle } from "@sporlo/ui";

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
      <main className="mx-auto max-w-md p-6">
        <Card>
          <p className="text-sm text-spo-danger">{t("expiredOrInvalid")}</p>
        </Card>
      </main>
    );
  }

  const { data: member } = await admin
    .from("members")
    .select("full_name_ar, full_name_en, member_number, email, status")
    .eq("id", tokenRow.member_id)
    .maybeSingle();
  const { data: org } = await admin
    .from("organizations")
    .select("name_ar, name_en")
    .eq("id", tokenRow.org_id)
    .maybeSingle();

  const memberName =
    locale === "ar"
      ? member?.full_name_ar
      : member?.full_name_en || member?.full_name_ar;
  const clubName = locale === "ar" ? org?.name_ar : org?.name_en;

  const { data: subs } = await admin
    .from("subscriptions")
    .select("id, status, starts_at, ends_at, plan:plans(name_ar, name_en, price_sar)")
    .eq("member_id", tokenRow.member_id)
    .order("created_at", { ascending: false });

  const activeSub = subs?.find((s) => s.status === "active");

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

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-1">
        <h1
          className="text-2xl font-semibold text-spo-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("publicTitle")} — {clubName}
        </h1>
        <p className="text-sm text-spo-muted">{t("publicSubtitle")}</p>
      </header>

      <Card className="space-y-2">
        <CardHeader>
          <CardTitle>{memberName}</CardTitle>
          <code className="rounded bg-spo-paper px-1.5 py-0.5 text-xs">
            {member?.member_number}
          </code>
        </CardHeader>
        {activeSub ? (
          (() => {
            const plan = Array.isArray(activeSub.plan)
              ? activeSub.plan[0]
              : activeSub.plan;
            const planName =
              locale === "ar" ? plan?.name_ar : plan?.name_en;
            return (
              <div className="space-y-2 text-sm text-spo-ink-2">
                <div className="flex items-center justify-between">
                  <span>{planName}</span>
                  <Badge tone="green">Active</Badge>
                </div>
                {activeSub.ends_at && (
                  <div className="text-xs text-spo-muted">
                    {dateFmt.format(new Date(activeSub.ends_at))}
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <p className="text-sm text-spo-muted">{t("noActiveSubscription")}</p>
        )}
      </Card>

      {payments && payments.length > 0 && (
        <Card>
          <h3 className="mb-3 text-base font-semibold text-spo-ink">Payments</h3>
          <ul className="space-y-1 text-sm">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between border-b border-spo-line py-1 last:border-0"
              >
                <span>{sarFmt.format(Number(p.amount_sar))}</span>
                <span className="text-xs text-spo-muted">
                  {p.paid_at ? dateFmt.format(new Date(p.paid_at)) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}
