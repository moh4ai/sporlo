import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import { JDsClient, type JDRow } from "./_components/JDsClient";

export default async function JDsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("job_descriptions")
    .select(
      "id, title_ar, title_en, department, level, responsibilities_ar, responsibilities_en, requirements_ar, requirements_en, active",
    )
    .order("created_at", { ascending: false });

  return (
    <JDsClient
      jds={(data ?? []) as JDRow[]}
      principal={{ role: tenant.user_role, department: tenant.department }}
      locale={locale as "ar" | "en"}
    />
  );
}
