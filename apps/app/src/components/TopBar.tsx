"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  ChevronDown,
  Languages,
  LogOut,
  Menu,
  Search,
  User,
} from "lucide-react";

import { DropdownMenu } from "@sporlo/ui";
import type { Principal } from "@sporlo/auth";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

import { MobileNavDrawer } from "./MobileNavDrawer";

export function TopBar({
  locale,
  principal,
}: {
  locale: "ar" | "en";
  principal: Principal;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const otherLocale = locale === "ar" ? "en" : "ar";
  const [navOpen, setNavOpen] = useState(false);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <>
      <header className="flex h-14 items-center justify-between gap-3 border-b border-spo-line bg-white px-4 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {/* Mobile burger */}
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label={t("openMenu")}
            className="rounded-md p-1.5 text-spo-ink-2 transition-colors hover:bg-spo-paper md:hidden"
          >
            <Menu className="size-5" />
          </button>
          {/* Branch picker (still a stub — Phase 5+) */}
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-pill border border-spo-line bg-white px-3 py-1.5 text-sm text-spo-ink-2 transition-colors hover:bg-spo-paper disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
            disabled
            aria-label={t("branchPicker")}
          >
            <span className="truncate">{t("branchPicker")}</span>
            <ChevronDown className="size-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Command-K stub — surfaces the search affordance; wired in later phase. */}
          <button
            type="button"
            className="hidden items-center gap-2 rounded-pill border border-spo-line bg-spo-paper px-3 py-1.5 text-sm text-spo-muted transition-colors hover:text-spo-ink-2 md:inline-flex"
            aria-label={t("commandPalette")}
          >
            <Search className="size-3.5" />
            <span>{t("search")}</span>
            <kbd className="ms-1 rounded border border-spo-line bg-white px-1 text-[10px] font-medium text-spo-muted">
              ⌘K
            </kbd>
          </button>

          {/* Notifications stub */}
          <button
            type="button"
            aria-label={t("notifications")}
            className="rounded-md p-1.5 text-spo-ink-2 transition-colors hover:bg-spo-paper"
          >
            <Bell className="size-4" />
          </button>

          {/* Locale toggle */}
          <Link
            href={pathname}
            locale={otherLocale}
            className="inline-flex items-center gap-1.5 rounded-pill border border-spo-line bg-white px-3 py-1.5 text-sm text-spo-ink-2 transition-colors hover:bg-spo-paper"
          >
            <Languages className="size-3.5" />
            <span className="hidden sm:inline">{t("switchLocale")}</span>
          </Link>

          {/* User menu */}
          <DropdownMenu
            align="end"
            triggerLabel={t("userMenu")}
            triggerClassName="size-9 rounded-full border border-spo-line bg-white hover:bg-spo-paper"
            trigger={<User className="size-4" />}
            items={[
              {
                key: "signOut",
                label: t("signOut"),
                icon: <LogOut className="size-4" />,
                onSelect: signOut,
              },
            ]}
          />
        </div>
      </header>

      <MobileNavDrawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        principal={principal}
      />
    </>
  );
}
