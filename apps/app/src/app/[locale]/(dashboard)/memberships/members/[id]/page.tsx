import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge, Button, Card, CardHeader, CardTitle } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

import { MemberForm } from "../_components/MemberForm";
import { PortalLinkButton } from "./_components/PortalLinkButton";

const STATUS_TONES = {
  active: "green",
  inactive: "neutral",
  prospect: "amber",
} as const;

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "memberships" });

  const supabase = await createSupabaseServerClient();
  const { data: member } = await supabase
    .from("members")
    .select(
      "id, full_name_ar, full_name_en, member_number, status, email, phone, national_id, date_of_birth, joined_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!member) notFound();

  // Subscription history (chunk 4 populates this).
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("id, status, starts_at, ends_at, plan_id")
    .eq("member_id", id)
    .order("created_at", { ascending: false });

  // Payment history.
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount_sar, status, provider, paid_at, created_at")
    .eq("member_id", id)
    .order("created_at", { ascending: false });

  const { data: redemptions } = await supabase
    .from("coupon_redemptions")
    .select("id, redeemed_at, coupon_id")
    .eq("member_id", id)
    .order("redeemed_at", { ascending: false });

  const sarFormatter = new Intl.NumberFormat(
    locale === "ar" ? "ar-SA" : "en-GB",
    { style: "currency", currency: "SAR" },
  );
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const name =
    locale === "ar" ? member.full_name_ar : member.full_name_en || member.full_name_ar;

  return (
    <div className="space-y-6">
      <Link
        href="/memberships/members"
        className="text-sm text-spo-muted hover:text-spo-ink"
      >
        ← {t("members.backToList")}
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-spo-ink">{name}</h2>
          <div className="flex items-center gap-2 text-sm text-spo-muted">
            <code className="rounded bg-spo-paper px-1.5 py-0.5 text-xs">
              {member.member_number}
            </code>
            <Badge tone={STATUS_TONES[member.status as keyof typeof STATUS_TONES]}>
              {t(`members.statuses.${member.status as "active" | "inactive" | "prospect"}`)}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PortalLinkButton memberId={id} />
          <Link href={`/memberships/members/${id}/subscribe`}>
            <Button variant="secondary">{t("subscriptions.actions.subscribe")}</Button>
          </Link>
        </div>
      </header>

      <MemberForm
        mode="edit"
        initial={{
          id: member.id,
          full_name_ar: member.full_name_ar,
          full_name_en: member.full_name_en ?? "",
          email: member.email ?? "",
          phone: member.phone ?? "",
          national_id: member.national_id ?? "",
          date_of_birth: member.date_of_birth ?? "",
          status: member.status as "active" | "inactive" | "prospect",
        }}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("members.detail.subscriptionsTitle")}</CardTitle>
          </CardHeader>
          {(!subs || subs.length === 0) ? (
            <p className="text-sm text-spo-muted">
              {t("members.detail.subscriptionsEmpty")}
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {subs.map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>{s.status}</span>
                  <span className="text-xs text-spo-muted">
                    {s.starts_at ? dateFmt.format(new Date(s.starts_at)) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("members.detail.paymentsTitle")}</CardTitle>
          </CardHeader>
          {(!payments || payments.length === 0) ? (
            <p className="text-sm text-spo-muted">
              {t("members.detail.paymentsEmpty")}
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>{sarFormatter.format(Number(p.amount_sar))}</span>
                  <span className="text-xs text-spo-muted">{p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("members.detail.couponsTitle")}</CardTitle>
          </CardHeader>
          {(!redemptions || redemptions.length === 0) ? (
            <p className="text-sm text-spo-muted">
              {t("members.detail.couponsEmpty")}
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {redemptions.map((r) => (
                <li key={r.id} className="text-xs text-spo-muted">
                  {dateFmt.format(new Date(r.redeemed_at))}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
