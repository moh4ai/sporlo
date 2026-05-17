import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { parseClaims, type Principal } from "@sporlo/auth";

import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { createSupabaseServerClient } from "@/lib/supabase-server";
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/sign-in`);

  // Decode the JWT to read the auth-hook-injected claims.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const claims = session ? parseClaims(session.access_token) : null;

  if (!claims?.org_id || !claims.role) {
    redirect(`/${locale}/onboarding`);
  }

  const principal: Principal = {
    role: claims.role,
    department: claims.department,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar principal={principal} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar locale={locale as "ar" | "en"} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
