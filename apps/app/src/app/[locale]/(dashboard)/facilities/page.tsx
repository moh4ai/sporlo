import { getTranslations, setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  FacilitiesListClient,
  type FacilityRow,
} from "./_components/FacilitiesListClient";

export default async function FacilitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "facilities" });
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("facilities")
    .select(
      "id, name_ar, name_en, facility_type, capacity, hourly_rate_sar, member_hourly_rate_sar, notes, active",
    )
    .order("created_at", { ascending: false });

  const rows: FacilityRow[] = (data ?? []).map((f) => ({
    id: f.id,
    name_ar: f.name_ar,
    name_en: f.name_en,
    facility_type: f.facility_type,
    capacity: f.capacity,
    hourly_rate_sar: f.hourly_rate_sar != null ? Number(f.hourly_rate_sar) : null,
    member_hourly_rate_sar:
      f.member_hourly_rate_sar != null ? Number(f.member_hourly_rate_sar) : null,
    notes: f.notes,
    active: f.active,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1
          className="text-3xl font-semibold text-spo-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("title")}
        </h1>
        <p className="text-sm text-spo-muted">{t("subtitle")}</p>
      </header>
      <FacilitiesListClient
        facilities={rows}
        principal={{ role: tenant.user_role, department: tenant.department }}
        locale={locale as "ar" | "en"}
      />
    </div>
  );
}
