import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

import { MemberForm } from "../_components/MemberForm";

export default async function NewMemberPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "memberships" });

  return (
    <div className="space-y-4">
      <Link
        href="/memberships/members"
        className="text-sm text-spo-muted hover:text-spo-ink"
      >
        ← {t("members.backToList")}
      </Link>
      <h2 className="text-xl font-semibold text-spo-ink">
        {t("members.form.createTitle")}
      </h2>
      <MemberForm mode="create" />
    </div>
  );
}
