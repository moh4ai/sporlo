import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import { CouponsClient, type CouponRow } from "./_components/CouponsClient";

export default async function CouponsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("discount_coupons")
    .select(
      "id, code, percent_off, used_count, max_uses, valid_from, valid_to, active",
    )
    .order("created_at", { ascending: false });

  const rows: CouponRow[] = (data ?? []).map((c) => ({
    id: c.id,
    code: c.code,
    percent_off: Number(c.percent_off),
    used_count: Number(c.used_count),
    max_uses: c.max_uses != null ? Number(c.max_uses) : null,
    valid_from: c.valid_from,
    valid_to: c.valid_to,
    active: c.active,
  }));

  return (
    <CouponsClient
      initialCoupons={rows}
      principal={{
        role: tenant.user_role,
        department: tenant.department,
      }}
      locale={locale as "ar" | "en"}
    />
  );
}
