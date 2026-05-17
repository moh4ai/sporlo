import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card, CardHeader, CardTitle, Stat, Badge } from "@sporlo/ui";
import type { Locale } from "@/i18n/routing";
import { MODULES } from "@/components/modules";

export default async function DashboardHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const tModules = await getTranslations({ locale, namespace: "modules" });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1
          className="text-3xl font-semibold text-spo-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("welcome")}
        </h1>
        <p className="max-w-2xl text-spo-muted">{t("intro")}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label={t("tier")}
          value={t("tierValue")}
          hint="Phase 0 — KPI engine not wired yet"
        />
        <Stat
          label="Active members"
          value="—"
          hint="Phase 1 — Memberships"
        />
        <Stat
          label={t("lastSync")}
          value="—"
          hint="Supabase wiring lands Day 2"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modules</CardTitle>
          <Badge tone="amber">Sprint 0 stubs</Badge>
        </CardHeader>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((mod) => (
            <li
              key={mod}
              className="rounded-xl border border-spo-line bg-white px-3 py-2 text-sm text-spo-ink-2"
            >
              {tModules(mod)}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
