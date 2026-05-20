import { getTranslations, setRequestLocale } from "next-intl/server";

import { PublicShell } from "@/components/PublicShell";
import { moyasarPublishableKey } from "@/lib/moyasar";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

import { CheckoutClient } from "./_components/CheckoutClient";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "store.shop.checkout" });
  const tenant = await resolvePublicTenant();

  return (
    <PublicShell locale={locale} tenant={tenant}>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold text-spo-ink sm:text-4xl">
          {t("title")}
        </h1>
        <CheckoutClient
          locale={locale as "ar" | "en"}
          moyasarConfigured={moyasarPublishableKey() !== null}
        />
      </div>
    </PublicShell>
  );
}
