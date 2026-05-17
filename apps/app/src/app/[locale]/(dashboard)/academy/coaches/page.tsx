import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  CoachesClient,
  type CoachRow,
} from "./_components/CoachesClient";

export default async function CoachesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("coaches")
    .select("id, full_name_ar, full_name_en, email, phone, bio, active")
    .order("created_at", { ascending: false });

  const coaches: CoachRow[] = (data ?? []) as CoachRow[];

  return (
    <CoachesClient
      coaches={coaches}
      principal={{ role: tenant.user_role, department: tenant.department }}
      locale={locale as "ar" | "en"}
    />
  );
}
