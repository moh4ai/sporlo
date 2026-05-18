import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/PageHeader";
import type { Locale } from "@/i18n/routing";

export default async function FansLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "fansManager" });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {children}
    </div>
  );
}
