"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Languages, Menu, X } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const NAV = [
  { key: "news", href: "/news" },
  { key: "fixtures", href: "/fixtures" },
  { key: "squad", href: "/squads" },
  { key: "shop", href: "/shop" },
  { key: "membership", href: "/membership" },
  { key: "stadium", href: "/welcome/stadium" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicShellNav({
  locale,
  hasTenant,
}: {
  locale: Locale;
  hasTenant: boolean;
}) {
  const t = useTranslations("publicShell");
  const pathname = usePathname();
  const otherLocale: Locale = locale === "ar" ? "en" : "ar";
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden items-center gap-1 md:flex">
        {hasTenant &&
          NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={
                  "rounded-pill px-3 py-1.5 text-sm transition-colors " +
                  (active
                    ? "bg-spo-green-soft text-spo-green-deep"
                    : "text-spo-ink-2 hover:bg-spo-paper")
                }
              >
                {t(`nav.${item.key}`)}
              </Link>
            );
          })}
        <Link
          href={pathname}
          locale={otherLocale}
          className="ms-1 inline-flex items-center gap-1.5 rounded-pill border border-spo-line bg-white px-3 py-1.5 text-sm text-spo-ink-2 transition-colors hover:bg-spo-paper"
        >
          <Languages className="size-3.5" />
          {t("switchLocale")}
        </Link>
      </nav>

      {/* Mobile burger */}
      {hasTenant && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("openMenu")}
          className="rounded-md p-1.5 text-spo-ink-2 hover:bg-spo-paper md:hidden"
        >
          <Menu className="size-5" />
        </button>
      )}

      {/* Mobile drawer */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-spo-ink/40 md:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            className="ms-auto flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-[var(--shadow-3)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-spo-line px-5 py-4">
              <span
                className="text-lg font-semibold text-spo-green-deep"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Menu
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("closeMenu")}
                className="rounded-md p-1.5 text-spo-muted hover:bg-spo-paper"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-1">
                {NAV.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={
                          "block rounded-xl px-3 py-2.5 text-sm transition-colors " +
                          (active
                            ? "bg-spo-green-soft font-medium text-spo-green-deep"
                            : "text-spo-ink-2 hover:bg-spo-paper")
                        }
                      >
                        {t(`nav.${item.key}`)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 border-t border-spo-line pt-4">
                <Link
                  href={pathname}
                  locale={otherLocale}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-spo-line bg-white px-3 py-1.5 text-sm text-spo-ink-2 hover:bg-spo-paper"
                >
                  <Languages className="size-3.5" />
                  {t("switchLocale")}
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
