import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { moyasarPublishableKey } from "@/lib/moyasar";
import type { Locale } from "@/i18n/routing";

import { BuyClient } from "./_components/BuyClient";

export default async function PublicBuyPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "events" });

  const admin = createServiceRoleClient();
  const { data: fixture } = await admin
    .from("fixtures")
    .select(
      "id, opponent_ar, opponent_en, kickoff_at, venue, status, organization:organizations(name_ar, name_en)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!fixture) notFound();
  if (!["scheduled", "in_progress"].includes(fixture.status)) {
    return (
      <main className="mx-auto max-w-md p-6">
        <Card>
          <p className="text-sm text-spo-muted">
            {t("publicListing.empty")}
          </p>
        </Card>
      </main>
    );
  }

  const { data: sections } = await admin
    .from("venue_sections")
    .select(
      "id, label, capacity, pricing:pricing_tiers(price_sar)",
    )
    .eq("fixture_id", id)
    .order("display_order", { ascending: true });

  const opts = (sections ?? []).map((s) => {
    const tier = Array.isArray(s.pricing) ? s.pricing[0] : s.pricing;
    return {
      id: s.id,
      label: s.label,
      capacity: s.capacity,
      price_sar: tier?.price_sar != null ? Number(tier.price_sar) : null,
    };
  });

  const org = Array.isArray(fixture.organization)
    ? fixture.organization[0]
    : fixture.organization;
  const orgName = locale === "ar" ? org?.name_ar : org?.name_en;
  const opp = locale === "ar" ? fixture.opponent_ar : fixture.opponent_en;
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <Link href="/fixtures" className="text-sm text-spo-muted hover:text-spo-ink">
        ← {t("common.back")}
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-spo-ink">
          {orgName} vs {opp}
        </h1>
        <p className="text-sm text-spo-muted">
          {dateFmt.format(new Date(fixture.kickoff_at))}
          {fixture.venue ? ` · ${fixture.venue}` : ""}
        </p>
      </header>

      <BuyClient
        fixtureId={id}
        sections={opts}
        locale={locale as "ar" | "en"}
        moyasarConfigured={moyasarPublishableKey() !== null}
      />
    </main>
  );
}
