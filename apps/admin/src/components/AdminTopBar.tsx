"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function AdminTopBar({ locale }: { locale: "ar" | "en" }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const otherLocale = locale === "ar" ? "en" : "ar";

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-spo-line bg-white px-5">
      <span className="text-sm text-spo-muted">Sporlo HQ — internal</span>
      <div className="flex items-center gap-2">
        <Link
          href={pathname}
          locale={otherLocale}
          className="rounded-pill border border-spo-line bg-white px-3 py-1.5 text-sm text-spo-ink-2 hover:bg-spo-paper"
        >
          {t("switchLocale")}
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="rounded-pill border border-spo-line bg-white px-3 py-1.5 text-sm text-spo-ink-2 hover:bg-spo-paper"
        >
          {t("signOut")}
        </button>
      </div>
    </header>
  );
}
