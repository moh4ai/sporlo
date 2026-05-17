import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { moyasarPublishableKey } from "@/lib/moyasar";
import type { Locale } from "@/i18n/routing";

import { TicketCheckoutClient } from "./_components/TicketCheckoutClient";

export default async function TicketCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string; paymentId: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { locale, id, paymentId } = await params;
  const sp = await searchParams;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "events.publicBuy" });

  const admin = createServiceRoleClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, amount_sar, status, org_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) notFound();

  const pubKey = moyasarPublishableKey();

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <Link
        href={`/fixtures/${id}/buy`}
        className="text-sm text-spo-muted hover:text-spo-ink"
      >
        ←
      </Link>
      <h1 className="text-2xl font-semibold text-spo-ink">{t("submit")}</h1>

      {!pubKey ? (
        <Card>
          <p className="text-sm text-spo-danger">{t("moyasarUnavailable")}</p>
        </Card>
      ) : (
        <TicketCheckoutClient
          publishableKey={pubKey}
          paymentId={payment.id}
          fixtureId={id}
          amountSar={Number(payment.amount_sar)}
          buyerEmail={sp.email ?? ""}
          locale={locale as "ar" | "en"}
        />
      )}
    </main>
  );
}
