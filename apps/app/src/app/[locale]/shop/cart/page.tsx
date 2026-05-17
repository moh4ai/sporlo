import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

import { CartClient } from "./_components/CartClient";

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "store.shop" });
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <Link href="/shop" className="text-sm text-spo-muted hover:text-spo-ink">
        ← {t("title")}
      </Link>
      <h1 className="text-2xl font-semibold text-spo-ink">{t("cart.title")}</h1>
      <CartClient locale={locale as "ar" | "en"} />
    </main>
  );
}
