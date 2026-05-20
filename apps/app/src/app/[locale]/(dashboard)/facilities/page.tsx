import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/PageHeader";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import { resolvePublicMediaSrc } from "@/lib/public-media";
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
      "id, name_ar, name_en, facility_type, capacity, hourly_rate_sar, member_hourly_rate_sar, notes, image_path, active",
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
    image_url: resolvePublicMediaSrc(
      f.image_path as string | null,
      supabase,
      "facility-images",
    ),
    active: f.active,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <FacilitiesListClient
        facilities={rows}
        principal={{ role: tenant.user_role, department: tenant.department }}
        locale={locale as "ar" | "en"}
      />
    </div>
  );
}
