import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { moyasarPublishableKey } from "@/lib/moyasar";
import type { Locale } from "@/i18n/routing";

import { SubscribeClient } from "./_components/SubscribeClient";

export default async function SubscribePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "memberships" });

  const supabase = await createSupabaseServerClient();
  const { data: member } = await supabase
    .from("members")
    .select("id, full_name_ar, full_name_en")
    .eq("id", id)
    .maybeSingle();
  if (!member) notFound();

  const { data: plans } = await supabase
    .from("plans")
    .select("id, code, name_ar, name_en, price_sar, duration_months")
    .eq("active", true)
    .order("price_sar", { ascending: true });

  const memberName =
    locale === "ar" ? member.full_name_ar : member.full_name_en || member.full_name_ar;

  return (
    <div className="space-y-4">
      <Link
        href={`/memberships/members/${id}`}
        className="text-sm text-spo-muted hover:text-spo-ink"
      >
        ← {t("members.backToList")}
      </Link>
      <h2 className="text-xl font-semibold text-spo-ink">
        {t("subscriptions.subscribe.title")} — {memberName}
      </h2>
      <SubscribeClient
        memberId={id}
        locale={locale as "ar" | "en"}
        plans={(plans ?? []).map((p) => ({
          id: p.id,
          code: p.code,
          name_ar: p.name_ar,
          name_en: p.name_en,
          price_sar: Number(p.price_sar),
          duration_months: p.duration_months,
        }))}
        moyasarConfigured={moyasarPublishableKey() !== null}
      />
    </div>
  );
}
