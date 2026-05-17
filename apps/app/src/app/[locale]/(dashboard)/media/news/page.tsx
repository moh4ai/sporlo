import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import { NewsClient, type ArticleRow } from "./_components/NewsClient";

export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("news_articles")
    .select(
      "id, slug, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, cover_image_path, published_at",
    )
    .order("created_at", { ascending: false });

  return (
    <NewsClient
      articles={(data ?? []) as ArticleRow[]}
      principal={{ role: tenant.user_role, department: tenant.department }}
      locale={locale as "ar" | "en"}
    />
  );
}
