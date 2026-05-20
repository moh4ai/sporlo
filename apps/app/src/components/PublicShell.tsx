import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { resolvePublicTenant, type PublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

import { PublicShellClient } from "./PublicShellClient";
import { PublicShellNav } from "./PublicShellNav";

/**
 * Shared chrome for every public route (news, fixtures, squads, shop,
 * pages, member portal). Resolves the active tenant from the
 * sporlo-tenant-slug cookie and renders header + footer around children.
 *
 * Keeps each page self-rendering its own main content — wrapping rather
 * than restructuring routes minimises blast radius for visual polish.
 */
export async function PublicShell({
  locale,
  children,
  tenant: tenantOverride,
  /** Hide the nav when true (used on member portal, where context is implicit). */
  minimal = false,
}: {
  locale: string;
  children: React.ReactNode;
  tenant?: PublicTenant | null;
  minimal?: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "publicShell" });
  const tenant = tenantOverride ?? (await resolvePublicTenant());
  const orgName = tenant
    ? locale === "ar"
      ? tenant.name_ar
      : tenant.name_en
    : null;

  return (
    <PublicShellClient locale={locale as "ar" | "en"}>
      <div className="flex min-h-screen flex-col bg-spo-paper-warm">
        <header className="border-b border-spo-line bg-white">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 text-spo-ink">
              <Image
                src="/brand/sporlo-logo-green.png"
                alt="Sporlo"
                width={28}
                height={28}
                priority
              />
              <span
                className="text-lg font-semibold text-spo-green-deep"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {orgName ?? "Sporlo"}
              </span>
            </Link>
            {!minimal && (
              <PublicShellNav locale={locale as Locale} hasTenant={!!tenant} />
            )}
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-spo-line bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-spo-muted sm:px-6">
            <span>
              © {new Date().getFullYear()} {orgName ?? "Sporlo"} —{" "}
              {t("footer.rights")}
            </span>
            <span>{t("footer.poweredBy")}</span>
          </div>
        </footer>
      </div>
    </PublicShellClient>
  );
}
