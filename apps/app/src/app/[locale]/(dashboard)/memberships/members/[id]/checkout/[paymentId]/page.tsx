import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { moyasarPublishableKey } from "@/lib/moyasar";
import type { Locale } from "@/i18n/routing";

import { MoyasarCheckoutClient } from "./_components/MoyasarCheckoutClient";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; paymentId: string }>;
}) {
  const { locale, id, paymentId } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "memberships" });

  const supabase = await createSupabaseServerClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, amount_sar, status, subscription_id")
    .eq("id", paymentId)
    .eq("member_id", id)
    .maybeSingle();
  if (!payment) notFound();

  const pubKey = moyasarPublishableKey();

  return (
    <div className="space-y-4">
      <Link
        href={`/memberships/members/${id}`}
        className="text-sm text-spo-muted hover:text-spo-ink"
      >
        ← {t("subscriptions.checkout.backToMember")}
      </Link>
      <h2 className="text-xl font-semibold text-spo-ink">
        {t("subscriptions.checkout.title")}
      </h2>
      <p className="text-sm text-spo-muted">{t("subscriptions.checkout.subtitle")}</p>

      {!pubKey ? (
        <Card>
          <p className="text-sm text-spo-danger">
            {t("subscriptions.checkout.missingKey")}
          </p>
        </Card>
      ) : (
        <MoyasarCheckoutClient
          publishableKey={pubKey}
          paymentId={payment.id}
          memberId={id}
          amountSar={Number(payment.amount_sar)}
          locale={locale as "ar" | "en"}
        />
      )}
    </div>
  );
}
