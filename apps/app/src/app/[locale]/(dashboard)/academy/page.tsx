import { getTranslations, setRequestLocale } from "next-intl/server";

import { EmptyState } from "@/components/EmptyState";
import type { Locale } from "@/i18n/routing";

export default async function AcademyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "empty" });
  return (
    <EmptyState
      title={t("academy.title")}
      body={t("academy.body")}
      ctaLabel={t("ctaAddFirst")}
      comingSoonLabel={t("comingSoon")}
    />
  );
}
