import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Card } from "@sporlo/ui";

import { PublicShell } from "@/components/PublicShell";
import { createServiceRoleClient, createSupabaseServerClient } from "@/lib/supabase-server";
import { moyasarPublishableKey } from "@/lib/moyasar";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

import { MoyasarMemberCheckoutClient } from "./_components/MoyasarMemberCheckoutClient";

export default async function MemberMoyasarCheckoutPage({
  params,
}: {
  params: Promise<{ locale: string; paymentId: string }>;
}) {
  const { locale, paymentId } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "membershipCheckout" });

  const tenant = await resolvePublicTenant();
  if (!tenant) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/sign-in`);

  const admin = createServiceRoleClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, amount_sar, status, member_id, members!inner(user_id, org_id)")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) notFound();

  // Guard against cross-user / cross-tenant access. The payment must belong
  // to the signed-in user AND the org currently scoped by the host cookie.
  const memberRel = Array.isArray(payment.members) ? payment.members[0] : payment.members;
  if (!memberRel || memberRel.user_id !== user.id || memberRel.org_id !== tenant.org_id) {
    notFound();
  }

  const pubKey = moyasarPublishableKey();

  return (
    <PublicShell locale={locale as Locale} tenant={tenant}>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-16 sm:px-6 sm:py-20">
        <header className="space-y-2">
          <h1
            className="text-3xl font-semibold text-spo-ink sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("widget.title")}
          </h1>
          <p className="text-sm text-spo-muted">{t("widget.subtitle")}</p>
        </header>

        {!pubKey ? (
          <Card>
            <p className="text-sm text-spo-danger">{t("widget.missingKey")}</p>
          </Card>
        ) : (
          <MoyasarMemberCheckoutClient
            publishableKey={pubKey}
            paymentId={payment.id as string}
            memberId={payment.member_id as string}
            amountSar={Number(payment.amount_sar)}
            locale={locale as "ar" | "en"}
          />
        )}
      </div>
    </PublicShell>
  );
}
