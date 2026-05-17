import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { moyasarPublishableKey } from "@/lib/moyasar";
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

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <Link href="/shop/cart" className="text-sm text-spo-muted hover:text-spo-ink">
        ←
      </Link>
      <h1 className="text-2xl font-semibold text-spo-ink">{t("title")}</h1>
      <CheckoutClient
        locale={locale as "ar" | "en"}
        moyasarConfigured={moyasarPublishableKey() !== null}
      />
    </main>
  );
}
