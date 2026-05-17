import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  MembersListClient,
  type MemberRow,
} from "./_components/MembersListClient";

export default async function MembersPage({
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
      "id, full_name_ar, full_name_en, member_number, status, email, phone, joined_at",
    )
    .order("joined_at", { ascending: false });

  return (
    <MembersListClient
      members={(data ?? []) as MemberRow[]}
      principal={{
        role: tenant.user_role,
        department: tenant.department,
      }}
      locale={locale as "ar" | "en"}
    />
  );
}
