import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import { NotificationsFeed, type FeedRow } from "./_components/NotificationsFeed";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tenant = await getActiveTenant();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title_ar, title_en, body_ar, body_en, href, read_at, created_at")
    .eq("recipient_user_id", tenant.user_id)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows: FeedRow[] = (data ?? []).map((r) => ({
    id: r.id as string,
    type: r.type as string,
    title_ar: r.title_ar as string,
    title_en: r.title_en as string,
    body_ar: (r.body_ar as string | null) ?? null,
    body_en: (r.body_en as string | null) ?? null,
    href: (r.href as string | null) ?? null,
    read_at: (r.read_at as string | null) ?? null,
    created_at: r.created_at as string,
  }));

  return <NotificationsFeed rows={rows} locale={locale as "ar" | "en"} />;
}
