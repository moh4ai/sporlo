import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/PageHeader";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  SquadsListClient,
  type SquadRow,
} from "./_components/SquadsListClient";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "team" });
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("squads")
    .select(
      "id, name_ar, name_en, season, sport_type, active, roster:roster_entries(id, active)",
    )
    .order("created_at", { ascending: false });

  const rows: SquadRow[] = (data ?? []).map((s) => {
    const roster = Array.isArray(s.roster) ? s.roster : [];
    return {
      id: s.id,
      name_ar: s.name_ar,
      name_en: s.name_en,
      season: s.season,
      sport_type: s.sport_type,
      active: s.active,
      player_count: roster.filter((r: { active: boolean }) => r.active).length,
    };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <SquadsListClient
        squads={rows}
        principal={{ role: tenant.user_role, department: tenant.department }}
        locale={locale as "ar" | "en"}
      />
    </div>
  );
}
