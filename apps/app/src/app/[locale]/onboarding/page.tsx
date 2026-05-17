import { setRequestLocale } from "next-intl/server";

import { OnboardingWizard } from "@/components/OnboardingWizard";
import type { Locale } from "@/i18n/routing";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <OnboardingWizard locale={locale as "ar" | "en"} />;
}
