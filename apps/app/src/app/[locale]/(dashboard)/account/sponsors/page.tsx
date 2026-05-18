import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { canPerform } from "@sporlo/auth";

import {
  createServiceRoleClient,
  createSupabaseServerClient,
} from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import { SponsorsClient, type SponsorRow } from "./_components/SponsorsClient";

export default async function SponsorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tenant = await getActiveTenant();
  const principal = { role: tenant.user_role, department: tenant.department };
  if (!canPerform(principal, "read", "sponsor")) {
    redirect(`/${locale}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("sponsors")
    .select(
      "id, name_ar, name_en, tier, logo_path, url, display_order, active",
    )
    .order("tier", { ascending: true })
    .order("display_order", { ascending: true });

  // Resolve public URLs for the logos so the table preview can render.
  const admin = createServiceRoleClient();
  const rows: SponsorRow[] = (data ?? []).map((r) => {
    const path = r.logo_path as string | null;
    const logoUrl = path
      ? admin.storage.from("sponsor-logos").getPublicUrl(path).data.publicUrl
      : null;
    return {
      id: r.id as string,
      name_ar: r.name_ar as string,
      name_en: r.name_en as string,
      tier: r.tier as SponsorRow["tier"],
      logo_path: path,
      logo_url: logoUrl,
      url: (r.url as string | null) ?? null,
      display_order: r.display_order as number,
      active: r.active as boolean,
    };
  });

  return <SponsorsClient sponsors={rows} locale={locale as "ar" | "en"} />;
}
