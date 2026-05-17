import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  CertsClient,
  type CertRow,
  type StaffOption,
} from "./_components/CertsClient";

export default async function CertificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();

  const { data: certData } = await supabase
    .from("certifications")
    .select(
      "id, staff_profile_id, name, issuer, issued_at, expires_at, staff:staff_profiles(full_name_ar, full_name_en)",
    )
    .order("expires_at", { ascending: true, nullsFirst: false });

  const certs: CertRow[] = (certData ?? []).map((c) => {
    const staff = Array.isArray(c.staff) ? c.staff[0] : c.staff;
    return {
      id: c.id,
      staff_profile_id: c.staff_profile_id,
      staff_name:
        locale === "ar"
          ? staff?.full_name_ar ?? "—"
          : staff?.full_name_en ?? staff?.full_name_ar ?? "—",
      name: c.name,
      issuer: c.issuer,
      issued_at: c.issued_at,
      expires_at: c.expires_at,
    };
  });

  const { data: staffData } = await supabase
    .from("staff_profiles")
    .select("id, full_name_ar, full_name_en")
    .eq("active", true);
  const staffOptions: StaffOption[] = (staffData ?? []).map((s) => ({
    id: s.id,
    label: locale === "ar" ? s.full_name_ar : s.full_name_en ?? s.full_name_ar,
  }));

  return (
    <CertsClient
      certs={certs}
      staffOptions={staffOptions}
      principal={{ role: tenant.user_role, department: tenant.department }}
      locale={locale as "ar" | "en"}
    />
  );
}
