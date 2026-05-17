import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  SessionsListClient,
  type CoachOption,
  type FacilityOption,
  type SessionRow,
} from "./_components/SessionsListClient";

export default async function SessionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();

  const { data: sessionData } = await supabase
    .from("academy_sessions")
    .select(
      "id, title_ar, title_en, scheduled_at, duration_minutes, age_group, cancelled_at, coach:coaches(full_name_ar, full_name_en)",
    )
    .order("scheduled_at", { ascending: false })
    .limit(60);

  const sessions: SessionRow[] = (sessionData ?? []).map((s) => {
    const coach = Array.isArray(s.coach) ? s.coach[0] : s.coach;
    return {
      id: s.id,
      title_ar: s.title_ar,
      title_en: s.title_en,
      scheduled_at: s.scheduled_at,
      duration_minutes: s.duration_minutes,
      age_group: s.age_group,
      coach_name:
        locale === "ar" ? coach?.full_name_ar : coach?.full_name_en ?? coach?.full_name_ar ?? null,
      cancelled_at: s.cancelled_at,
    };
  });

  const { data: coachData } = await supabase
    .from("coaches")
    .select("id, full_name_ar, full_name_en")
    .eq("active", true)
    .order("created_at", { ascending: false });
  const coaches: CoachOption[] = (coachData ?? []).map((c) => ({
    id: c.id,
    label: locale === "ar" ? c.full_name_ar : c.full_name_en ?? c.full_name_ar,
  }));

  const { data: facilityData } = await supabase
    .from("facilities")
    .select("id, name_ar, name_en")
    .eq("active", true);
  const facilities: FacilityOption[] = (facilityData ?? []).map((f) => ({
    id: f.id,
    label: locale === "ar" ? f.name_ar : f.name_en,
  }));

  return (
    <SessionsListClient
      sessions={sessions}
      coaches={coaches}
      facilities={facilities}
      principal={{ role: tenant.user_role, department: tenant.department }}
      locale={locale as "ar" | "en"}
    />
  );
}
