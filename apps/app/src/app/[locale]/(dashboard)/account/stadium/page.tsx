import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { canPerform } from "@sporlo/auth";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import { StadiumForm, type StadiumRow } from "./_components/StadiumForm";

export default async function StadiumPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tenant = await getActiveTenant();
  const principal = { role: tenant.user_role, department: tenant.department };
  if (!canPerform(principal, "read", "stadium")) {
    redirect(`/${locale}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("stadium_info")
    .select(
      "name_ar, name_en, address_ar, address_en, city_ar, city_en, capacity, opened_year, map_lat, map_lng, parking_notes_ar, parking_notes_en, accessibility_notes_ar, accessibility_notes_en",
    )
    .eq("org_id", tenant.org_id)
    .maybeSingle();

  const row: StadiumRow = {
    name_ar: (data?.name_ar as string | null) ?? null,
    name_en: (data?.name_en as string | null) ?? null,
    address_ar: (data?.address_ar as string | null) ?? null,
    address_en: (data?.address_en as string | null) ?? null,
    city_ar: (data?.city_ar as string | null) ?? null,
    city_en: (data?.city_en as string | null) ?? null,
    capacity: (data?.capacity as number | null) ?? null,
    opened_year: (data?.opened_year as number | null) ?? null,
    map_lat: data?.map_lat != null ? Number(data.map_lat) : null,
    map_lng: data?.map_lng != null ? Number(data.map_lng) : null,
    parking_notes_ar: (data?.parking_notes_ar as string | null) ?? null,
    parking_notes_en: (data?.parking_notes_en as string | null) ?? null,
    accessibility_notes_ar: (data?.accessibility_notes_ar as string | null) ?? null,
    accessibility_notes_en: (data?.accessibility_notes_en as string | null) ?? null,
  };

  return <StadiumForm initial={row} />;
}
