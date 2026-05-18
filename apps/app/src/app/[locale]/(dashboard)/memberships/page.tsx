import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import { PlansClient } from "./_components/PlansClient";

export default async function PlansPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tenant = await getActiveTenant();
  const supabase = await createSupabaseServerClient();
  const { data: plans } = await supabase
    .from("plans")
    .select(
      "id, code, name_ar, name_en, duration_months, price_sar, member_only_store_discount_pct, active, public_visible, benefits_jsonb",
    )
    .order("created_at", { ascending: false });

  return (
    <PlansClient
      initialPlans={(plans ?? []).map((p) => ({
        ...p,
        price_sar: Number(p.price_sar),
        member_only_store_discount_pct: Number(p.member_only_store_discount_pct),
        public_visible: Boolean(p.public_visible),
        benefits: Array.isArray(p.benefits_jsonb)
          ? (p.benefits_jsonb as Array<{ ar?: string; en?: string }>).map(
              (b) => ({ ar: b.ar ?? "", en: b.en ?? "" }),
            )
          : [],
      }))}
      principal={{
        role: tenant.user_role,
        department: tenant.department,
      }}
      locale={locale as "ar" | "en"}
    />
  );
}
