import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  RefundsClient,
  type RefundRow,
  type RefundablePayment,
} from "./_components/RefundsClient";

export default async function RefundsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();

  // Refunds with related payment + member info.
  const { data: refundRows } = await supabase
    .from("refunds")
    .select(
      "id, payment_id, amount_sar, reason, status, created_at, payment:payments(amount_sar, provider, member:members(full_name_ar, full_name_en))",
    )
    .order("created_at", { ascending: false });

  const refunds: RefundRow[] = (refundRows ?? []).map((r) => {
    const pay = Array.isArray(r.payment) ? r.payment[0] : r.payment;
    const member = pay
      ? Array.isArray(pay.member)
        ? pay.member[0]
        : pay.member
      : null;
    const memberName =
      locale === "ar"
        ? member?.full_name_ar ?? "—"
        : member?.full_name_en || member?.full_name_ar || "—";
    return {
      id: r.id,
      payment_id: r.payment_id,
      amount_sar: Number(r.amount_sar),
      reason: r.reason,
      status: r.status,
      member_name: memberName,
      payment_amount: Number(pay?.amount_sar ?? 0),
      payment_provider: pay?.provider ?? "—",
      created_at: r.created_at,
    };
  });

  // Refundable payments = paid, no outstanding refund row, in this org.
  const { data: paidPayments } = await supabase
    .from("payments")
    .select(
      "id, amount_sar, provider, member:members(full_name_ar, full_name_en)",
    )
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(100);

  const refundablePayments: RefundablePayment[] = (paidPayments ?? []).map((p) => {
    const member = Array.isArray(p.member) ? p.member[0] : p.member;
    return {
      id: p.id,
      amount_sar: Number(p.amount_sar),
      member_name:
        locale === "ar"
          ? member?.full_name_ar ?? "—"
          : member?.full_name_en || member?.full_name_ar || "—",
      provider: p.provider ?? "—",
    };
  });

  return (
    <RefundsClient
      refunds={refunds}
      refundablePayments={refundablePayments}
      principal={{
        role: tenant.user_role,
        department: tenant.department,
      }}
      locale={locale as "ar" | "en"}
    />
  );
}
