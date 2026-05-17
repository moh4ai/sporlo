import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { parseClaims } from "@sporlo/auth";

import { AdminTopBar } from "@/components/AdminTopBar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

export default async function AdminLayout({
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

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const claims = session ? parseClaims(session.access_token) : null;

  if (claims?.role !== "super_admin") {
    // Render a not-authorized stub instead of an infinite redirect loop.
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-3 rounded-card-lg border border-spo-line bg-white p-6 shadow-sm">
          <NotAuthorized locale={locale as Locale} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar locale={locale as "ar" | "en"} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

async function NotAuthorized({ locale }: { locale: Locale }) {
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations({ locale, namespace: "signIn" });
  return (
    <>
      <h1 className="text-lg font-semibold text-spo-ink">
        {t("notAuthorized")}
      </h1>
      <p className="text-sm text-spo-muted">{t("instructionsBody")}</p>
    </>
  );
}
