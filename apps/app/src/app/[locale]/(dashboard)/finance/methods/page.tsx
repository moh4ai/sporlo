import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import { MethodsClient, type MethodRow } from "./_components/MethodsClient";

export default async function MethodsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("payment_methods")
    .select("id, label, type, details_jsonb, active")
    .order("created_at", { ascending: false });

  const methods: MethodRow[] = (data ?? []).map((m) => ({
    id: m.id,
    label: m.label,
    type: m.type,
    details_note:
      typeof m.details_jsonb === "object" &&
      m.details_jsonb !== null &&
      "note" in m.details_jsonb
        ? String((m.details_jsonb as { note?: unknown }).note ?? "")
        : "",
    active: m.active,
  }));

  return (
    <MethodsClient
      methods={methods}
      principal={{
        role: tenant.user_role,
        department: tenant.department,
      }}
    />
  );
}
