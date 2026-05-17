import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { moyasarPublishableKey } from "@/lib/moyasar";
import { createServiceRoleClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

import { OrderCheckoutClient } from "./_components/OrderCheckoutClient";

export default async function OrderMoyasarCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; paymentId: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { locale, paymentId } = await params;
  const sp = await searchParams;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "store.shop.checkout" });

  const admin = createServiceRoleClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, amount_sar, status")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) notFound();

  const pubKey = moyasarPublishableKey();

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <Link href="/shop" className="text-sm text-spo-muted hover:text-spo-ink">
        ←
      </Link>
      <h1 className="text-2xl font-semibold text-spo-ink">{t("submit")}</h1>
      {!pubKey ? (
        <Card>
          <p className="text-sm text-spo-danger">{t("moyasarUnavailable")}</p>
        </Card>
      ) : (
        <OrderCheckoutClient
          publishableKey={pubKey}
          paymentId={payment.id}
          amountSar={Number(payment.amount_sar)}
          buyerEmail={sp.email ?? ""}
          locale={locale as "ar" | "en"}
        />
      )}
    </main>
  );
}
