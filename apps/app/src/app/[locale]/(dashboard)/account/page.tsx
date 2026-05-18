import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { canPerform } from "@sporlo/auth";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import { AccountForm, type OrgRow } from "./_components/AccountForm";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tenant = await getActiveTenant();
  const principal = { role: tenant.user_role, department: tenant.department };
  if (!canPerform(principal, "read", "account")) {
    redirect(`/${locale}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("organizations")
    .select(
      "id, slug, name_ar, name_en, tagline_ar, tagline_en, subdomain, custom_domain, primary_color, logo_path, tier, subscription_tier, archived_at, social_jsonb, app_store_url, play_store_url, newsletter_provider",
    )
    .eq("id", tenant.org_id)
    .single();

  if (!data) redirect(`/${locale}`);

  const org = data as OrgRow;

  // Resolve a public URL for the current logo so the form can preview it.
  let logoUrl: string | null = null;
  if (org.logo_path) {
    const { data: pub } = supabase.storage
      .from("org-branding")
      .getPublicUrl(org.logo_path);
    logoUrl = pub.publicUrl;
  }

  const canEdit = canPerform(principal, "update", "account");

  return (
    <AccountForm
      org={org}
      logoUrl={logoUrl}
      canEdit={canEdit}
      locale={locale as "ar" | "en"}
    />
  );
}
