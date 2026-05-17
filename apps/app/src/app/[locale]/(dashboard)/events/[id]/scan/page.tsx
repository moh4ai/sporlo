import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

import { ScannerClient } from "./_components/ScannerClient";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "events" });

  const supabase = await createSupabaseServerClient();
  const { data: fixture } = await supabase
    .from("fixtures")
    .select("id, opponent_ar, opponent_en, kickoff_at")
    .eq("id", id)
    .maybeSingle();
  if (!fixture) notFound();

  const name = locale === "ar" ? fixture.opponent_ar : fixture.opponent_en;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link
        href={`/events/${id}`}
        className="text-sm text-spo-muted hover:text-spo-ink"
      >
        ← {t("common.back")}
      </Link>
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-spo-ink">{t("scan.title")}</h2>
        <p className="text-sm text-spo-muted">
          {name} · {t("scan.subtitle")}
        </p>
      </header>
      <ScannerClient locale={locale as "ar" | "en"} />
    </div>
  );
}
