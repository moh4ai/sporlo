import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import { PrefsClient, type PrefRow } from "./_components/PrefsClient";

type MemberDb = {
  id: string;
  full_name_ar: string;
  full_name_en: string | null;
  prefs: { email_opt_in: boolean; sms_opt_in: boolean; whatsapp_opt_in: boolean } | { email_opt_in: boolean; sms_opt_in: boolean; whatsapp_opt_in: boolean }[] | null;
};

export default async function PrefsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("members")
    .select(
      "id, full_name_ar, full_name_en, prefs:notification_prefs(email_opt_in, sms_opt_in, whatsapp_opt_in)",
    )
    .eq("status", "active")
    .order("full_name_ar");

  const rows: PrefRow[] = ((data ?? []) as MemberDb[]).map((m) => {
    const p = Array.isArray(m.prefs) ? m.prefs[0] : m.prefs;
    return {
      member_id: m.id,
      member_name: locale === "ar" ? m.full_name_ar : m.full_name_en ?? m.full_name_ar,
      email_opt_in: p?.email_opt_in ?? true,
      sms_opt_in: p?.sms_opt_in ?? false,
      whatsapp_opt_in: p?.whatsapp_opt_in ?? false,
    };
  });

  return (
    <PrefsClient
      rows={rows}
      principal={{ role: tenant.user_role, department: tenant.department }}
    />
  );
}
