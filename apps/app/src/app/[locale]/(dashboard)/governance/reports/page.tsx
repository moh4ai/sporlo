import { setRequestLocale } from "next-intl/server";

import { currentQuarter } from "@sporlo/governance";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import { ReportsClient, type ReportRow } from "./_components/ReportsClient";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("ministry_reports")
    .select("id, quarter, format, total_score, generated_at, submitted_at")
    .order("generated_at", { ascending: false });

  return (
    <ReportsClient
      reports={(data ?? []) as ReportRow[]}
      defaultQuarter={currentQuarter()}
      principal={{ role: tenant.user_role, department: tenant.department }}
      locale={locale as "ar" | "en"}
    />
  );
}
