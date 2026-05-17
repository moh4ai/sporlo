import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  DisclosuresClient,
  type DisclosureRow,
} from "./_components/DisclosuresClient";

export default async function DisclosuresPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("quarterly_disclosures")
    .select(
      "id, quarter, submitted_at, document:governance_documents(storage_path)",
    )
    .order("quarter", { ascending: false });

  const rows: DisclosureRow[] = (data ?? []).map((d) => {
    const doc = Array.isArray(d.document) ? d.document[0] : d.document;
    return {
      id: d.id,
      quarter: d.quarter,
      submitted_at: d.submitted_at,
      storage_path: doc?.storage_path ?? null,
    };
  });

  return (
    <DisclosuresClient
      disclosures={rows}
      principal={{
        role: tenant.user_role,
        department: tenant.department,
      }}
      locale={locale as "ar" | "en"}
    />
  );
}
