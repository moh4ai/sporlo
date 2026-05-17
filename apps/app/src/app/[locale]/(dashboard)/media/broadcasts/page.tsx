import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  BroadcastsClient,
  type BroadcastRow,
} from "./_components/BroadcastsClient";

export default async function BroadcastsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("broadcasts")
    .select(
      "id, channel, audience, subject, body_ar, status, recipient_count, sent_count, failed_count, sent_at, created_at",
    )
    .order("created_at", { ascending: false });

  return (
    <BroadcastsClient
      broadcasts={(data ?? []) as BroadcastRow[]}
      principal={{ role: tenant.user_role, department: tenant.department }}
      locale={locale as "ar" | "en"}
    />
  );
}
