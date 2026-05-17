import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  DeadlinesClient,
  type DeadlineRow,
} from "./_components/DeadlinesClient";

export default async function DeadlinesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("governance_deadlines")
    .select("id, title_ar, due_at, warning_at, satisfied_at")
    .order("due_at", { ascending: true });

  return (
    <DeadlinesClient
      deadlines={(data ?? []) as DeadlineRow[]}
      principal={{ role: tenant.user_role, department: tenant.department }}
      locale={locale as "ar" | "en"}
    />
  );
}
