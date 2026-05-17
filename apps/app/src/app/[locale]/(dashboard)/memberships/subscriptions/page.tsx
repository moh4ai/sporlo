import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  SubscriptionsListClient,
  type SubscriptionRow,
} from "./_components/SubscriptionsListClient";

export default async function SubscriptionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("subscriptions")
    .select(
      "id, status, member_id, starts_at, ends_at, member:members(full_name_ar, full_name_en), plan:plans(name_ar, name_en, price_sar)",
    )
    .order("created_at", { ascending: false });

  const rows: SubscriptionRow[] = (data ?? []).map((s) => {
    const member = Array.isArray(s.member) ? s.member[0] : s.member;
    const plan = Array.isArray(s.plan) ? s.plan[0] : s.plan;
    return {
      id: s.id,
      status: s.status,
      member_id: s.member_id,
      member_name:
        locale === "ar"
          ? member?.full_name_ar ?? "—"
          : member?.full_name_en || member?.full_name_ar || "—",
      plan_name: locale === "ar" ? plan?.name_ar ?? "—" : plan?.name_en ?? "—",
      plan_price: Number(plan?.price_sar ?? 0),
      starts_at: s.starts_at,
      ends_at: s.ends_at,
    };
  });

  return (
    <SubscriptionsListClient
      subs={rows}
      principal={{
        role: tenant.user_role,
        department: tenant.department,
      }}
      locale={locale as "ar" | "en"}
    />
  );
}
