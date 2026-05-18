import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { canPerform } from "@sporlo/auth";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  FanPortalManager,
  type CurrentSettings,
  type NewsOption,
  type ProductOption,
} from "./_components/FanPortalManager";

export default async function FansPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tenant = await getActiveTenant();
  const principal = { role: tenant.user_role, department: tenant.department };
  if (!canPerform(principal, "read", "fan_portal")) {
    redirect(`/${locale}`);
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: settings }, { data: org }, { data: news }, { data: products }] =
    await Promise.all([
      supabase
        .from("fan_portal_settings")
        .select(
          "hero_enabled, next_match_enabled, news_enabled, squad_enabled, shop_enabled, about_enabled, featured_news_id, featured_product_id",
        )
        .eq("org_id", tenant.org_id)
        .maybeSingle(),
      supabase
        .from("organizations")
        .select("slug, subdomain, custom_domain")
        .eq("id", tenant.org_id)
        .maybeSingle(),
      supabase
        .from("news_articles")
        .select("id, title_ar, title_en, published_at")
        .not("published_at", "is", null)
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(30),
      supabase
        .from("products")
        .select("id, name_ar, name_en")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const current: CurrentSettings = {
    hero_enabled: settings?.hero_enabled ?? true,
    next_match_enabled: settings?.next_match_enabled ?? true,
    news_enabled: settings?.news_enabled ?? true,
    squad_enabled: settings?.squad_enabled ?? true,
    shop_enabled: settings?.shop_enabled ?? true,
    about_enabled: settings?.about_enabled ?? true,
    featured_news_id: (settings?.featured_news_id as string | null) ?? null,
    featured_product_id: (settings?.featured_product_id as string | null) ?? null,
  };

  const newsOptions: NewsOption[] = (news ?? []).map((n) => ({
    id: n.id as string,
    title_ar: n.title_ar as string,
    title_en: n.title_en as string,
  }));

  const productOptions: ProductOption[] = (products ?? []).map((p) => ({
    id: p.id as string,
    name_ar: p.name_ar as string,
    name_en: p.name_en as string,
  }));

  // Build the public URL the "View fan portal" button opens. Production
  // uses the subdomain (or custom domain) to scope to this org; in dev
  // we fall back to the ?org= query string the proxy honours for local
  // browsing.
  const isProd =
    process.env.NODE_ENV === "production" ||
    (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://");
  const slug = (org?.subdomain as string | null) ?? (org?.slug as string);
  const publicUrl = isProd
    ? `https://${(org?.custom_domain as string | null) ?? `${slug}.sporlo.net`}/${locale}/welcome`
    : `/${locale}/welcome?org=${slug}`;

  return (
    <FanPortalManager
      current={current}
      newsOptions={newsOptions}
      productOptions={productOptions}
      publicUrl={publicUrl}
      locale={locale as "ar" | "en"}
    />
  );
}
