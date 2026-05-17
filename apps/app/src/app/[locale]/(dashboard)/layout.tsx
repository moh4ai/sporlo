import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import type { Principal } from "@sporlo/auth";

import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
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
