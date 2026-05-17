import { getTranslations } from "next-intl/server";

import { Card } from "@sporlo/ui";

import type { Locale } from "@/i18n/routing";

export async function ComingNext({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "memberships" });
  return (
    <Card>
      <p className="text-sm text-spo-muted">{t("common.comingNext")}</p>
    </Card>
  );
}
