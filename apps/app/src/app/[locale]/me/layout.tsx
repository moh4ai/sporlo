import Image from "next/image";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getActiveTenant, TenantError } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

// Layout for the auth'd member portal. Distinct from the staff dashboard
// chrome — members get a compact header + content, no sidebar. Redirects
// non-member roles back to the staff dashboard so users can't see the
// "wrong" UI for their account.
export default async function MeLayout({
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
  } catch (err) {
    if (err instanceof TenantError) {
      redirect(`/${locale}/sign-in`);
    }
    throw err;
  }

  if (tenant.user_role !== "member") {
    // Staff/admin shouldn't be on /me — push them to the dashboard.
    redirect(`/${locale}`);
  }

  const t = await getTranslations({ locale, namespace: "memberPortal" });

  // Fetch the org name for the header (service-role since member's RLS
  // doesn't grant SELECT on organizations).
  const admin = createServiceRoleClient();
  const { data: org } = await admin
    .from("organizations")
    .select("name_ar, name_en")
    .eq("id", tenant.org_id)
    .maybeSingle();
  const orgName = org
    ? locale === "ar"
      ? org.name_ar
      : org.name_en
    : "Sporlo";

  const otherLocale = locale === "ar" ? "en" : "ar";

  return (
    <div className="flex min-h-screen flex-col bg-spo-paper-warm">
      <header className="border-b border-spo-line bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/me" className="flex items-center gap-2 text-spo-ink">
            <Image
              src="/brand/sporlo-logo-green.png"
              alt="Sporlo"
              width={28}
              height={28}
              priority
            />
            <span
              className="text-base font-semibold text-spo-green-deep"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {orgName}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/me"
              locale={otherLocale}
              className="rounded-pill border border-spo-line bg-white px-3 py-1.5 text-xs text-spo-ink-2 hover:bg-spo-paper"
            >
              {otherLocale === "ar" ? "العربية" : "English"}
            </Link>
            <SignOutButton label={t("signOut")} />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-spo-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 text-xs text-spo-muted sm:px-6">
          <span>
            © {new Date().getFullYear()} {orgName}
          </span>
          <span>{t("poweredBy")}</span>
        </div>
      </footer>
    </div>
  );
}
