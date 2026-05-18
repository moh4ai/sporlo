import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import { NewsClient, type ArticleRow, type FixtureOption } from "./_components/NewsClient";

export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const [{ data: articles }, { data: fixtures }] = await Promise.all([
    supabase
      .from("news_articles")
      .select(
        "id, slug, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, cover_image_path, published_at, category, fixture_id",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("fixtures")
      .select("id, opponent_ar, opponent_en, kickoff_at")
      .order("kickoff_at", { ascending: false })
      .limit(50),
  ]);

  const fixtureOptions: FixtureOption[] = (fixtures ?? []).map((f) => ({
    id: f.id as string,
    opponent_ar: (f.opponent_ar as string | null) ?? "",
    opponent_en: (f.opponent_en as string | null) ?? "",
    kickoff_at: f.kickoff_at as string,
  }));

  return (
    <NewsClient
      articles={(articles ?? []) as ArticleRow[]}
      fixtures={fixtureOptions}
      principal={{ role: tenant.user_role, department: tenant.department }}
      locale={locale as "ar" | "en"}
    />
  );
}
