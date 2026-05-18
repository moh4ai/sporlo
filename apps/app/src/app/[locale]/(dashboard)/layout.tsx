import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import type { Principal } from "@sporlo/auth";

import { PrefsInit } from "@/components/PrefsInit";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  enforceHostMatchesOrg,
  getActiveTenant,
  TenantError,
} from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  let tenant;
  try {
    tenant = await getActiveTenant();
    await enforceHostMatchesOrg(tenant);
  } catch (err) {
    if (err instanceof TenantError) {
      if (err.message === "no-session") redirect(`/${locale}/sign-in`);
      if (err.message === "no-org-claim") redirect(`/${locale}/onboarding`);
      if (err.message === "host-org-mismatch") redirect(`/${locale}/sign-in`);
    }
    throw err;
  }

  const principal: Principal = {
    role: tenant.user_role,
    department: tenant.department,
  };

  // Pull just the appearance prefs needed to seed PrefsInit on first paint.
  // Notification + locale prefs are read on the /settings page itself.
  const supabase = await createSupabaseServerClient();
  const [{ data: settings }, { data: notifications }, { count: unreadCount }] =
    await Promise.all([
      supabase
        .from("user_settings")
        .select("prefs_jsonb")
        .eq("user_id", tenant.user_id)
        .maybeSingle(),
      supabase
        .from("notifications")
        .select("id, type, title_ar, title_en, body_ar, body_en, href, read_at, created_at")
        .eq("recipient_user_id", tenant.user_id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", tenant.user_id)
        .is("read_at", null),
    ]);
  const prefs = (settings?.prefs_jsonb ?? {}) as Record<string, unknown>;
  const highContrast = prefs.high_contrast === true;
  const reducedMotion = prefs.reduced_motion === true;

  const initialNotifications = (notifications ?? []).map((n) => ({
    id: n.id as string,
    type: n.type as string,
    title_ar: n.title_ar as string,
    title_en: n.title_en as string,
    body_ar: (n.body_ar as string | null) ?? null,
    body_en: (n.body_en as string | null) ?? null,
    href: (n.href as string | null) ?? null,
    read_at: (n.read_at as string | null) ?? null,
    created_at: n.created_at as string,
  }));

  return (
    <div className="flex min-h-screen">
      <PrefsInit highContrast={highContrast} reducedMotion={reducedMotion} />
      <Sidebar principal={principal} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          locale={locale as "ar" | "en"}
          principal={principal}
          initialNotifications={initialNotifications}
          initialUnread={unreadCount ?? 0}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
