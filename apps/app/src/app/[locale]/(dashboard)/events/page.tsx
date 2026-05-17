import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import { FixturesListClient, type FixtureRow } from "./_components/FixturesListClient";

export default async function FixturesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("fixtures")
    .select(
      "id, opponent_ar, opponent_en, kickoff_at, venue, status, home_score, away_score",
    )
    .order("kickoff_at", { ascending: false });

  const fixtures: FixtureRow[] = (data ?? []) as FixtureRow[];

  return (
    <FixturesListClient
      fixtures={fixtures}
      principal={{
        role: tenant.user_role,
        department: tenant.department,
      }}
      locale={locale as "ar" | "en"}
    />
  );
}
