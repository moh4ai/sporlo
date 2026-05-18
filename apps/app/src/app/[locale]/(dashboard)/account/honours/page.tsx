import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { canPerform } from "@sporlo/auth";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import { HonoursClient, type HonourRow } from "./_components/HonoursClient";

export default async function HonoursPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tenant = await getActiveTenant();
  const principal = { role: tenant.user_role, department: tenant.department };
  if (!canPerform(principal, "read", "honour")) {
    redirect(`/${locale}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("honours")
    .select(
      "id, competition_ar, competition_en, kind, win_count, last_won_year, display_order",
    )
    .order("display_order", { ascending: true })
    .order("win_count", { ascending: false });

  const rows: HonourRow[] = (data ?? []).map((r) => ({
    id: r.id as string,
    competition_ar: r.competition_ar as string,
    competition_en: r.competition_en as string,
    kind: r.kind as HonourRow["kind"],
    win_count: r.win_count as number,
    last_won_year: r.last_won_year as number | null,
    display_order: r.display_order as number,
  }));

  return <HonoursClient honours={rows} locale={locale as "ar" | "en"} />;
}
