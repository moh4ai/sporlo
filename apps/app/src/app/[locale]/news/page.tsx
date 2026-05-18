import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Card } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { PublicShell } from "@/components/PublicShell";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

const CATEGORIES = [
  "general",
  "match_report",
  "press",
  "transfer",
  "community",
  "youth",
] as const;

type Category = (typeof CATEGORIES)[number];

export default async function PublicNewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "media" });

  const tenant = await resolvePublicTenant();
  if (!tenant) notFound();

  const activeCategory: Category | "all" =
    sp.category && (CATEGORIES as readonly string[]).includes(sp.category)
      ? (sp.category as Category)
      : "all";

  const admin = createServiceRoleClient();
  let query = admin
    .from("news_articles")
    .select(
      "id, slug, title_ar, title_en, excerpt_ar, excerpt_en, cover_image_path, published_at, category",
    )
    .eq("org_id", tenant.org_id)
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(50);
  if (activeCategory !== "all") {
    query = query.eq("category", activeCategory);
  }
  const { data } = await query;

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const articles = data ?? [];
  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <PublicShell locale={locale} tenant={tenant}>
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:px-6 sm:py-20">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
            {t("news.title")}
          </p>
          <h1
            className="text-4xl font-semibold text-spo-ink sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {locale === "ar" ? tenant.name_ar : tenant.name_en}
          </h1>
        </header>

        {/* Category filter chips */}
        <nav className="flex flex-wrap gap-2">
          <Link
            href="/news"
            className={
              "inline-flex items-center rounded-pill border px-3 py-1.5 text-sm transition-colors " +
              (activeCategory === "all"
                ? "border-spo-green bg-spo-green text-white"
                : "border-spo-line bg-white text-spo-ink-2 hover:bg-spo-paper")
            }
          >
            {t("news.categories.all")}
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/news?category=${c}`}
              className={
                "inline-flex items-center rounded-pill border px-3 py-1.5 text-sm transition-colors " +
                (activeCategory === c
                  ? "border-spo-green bg-spo-green text-white"
                  : "border-spo-line bg-white text-spo-ink-2 hover:bg-spo-paper")
              }
            >
              {t(`news.categories.${c}`)}
            </Link>
          ))}
        </nav>

        {articles.length === 0 ? (
          <Card>
            <p className="text-sm text-spo-muted">{t("news.empty")}</p>
          </Card>
        ) : (
          <div className="space-y-10">
            {/* Featured hero */}
            {featured && (
              <Link
                href={`/news/${featured.slug}`}
                className="group block overflow-hidden rounded-card border border-spo-line bg-white transition-all hover:-translate-y-0.5 hover:border-spo-green/40 hover:shadow-[var(--shadow-2)]"
              >
                <div className="grid gap-0 md:grid-cols-2">
                  <div className="relative aspect-[16/10] overflow-hidden bg-spo-green-soft md:aspect-auto">
                    {featured.cover_image_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={featured.cover_image_path}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        className="flex h-full w-full items-center justify-center text-3xl text-spo-green-deep/30"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {(locale === "ar"
                          ? tenant.name_ar
                          : tenant.name_en
                        ).slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
                    {featured.published_at && (
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-spo-muted">
                        {dateFmt.format(new Date(featured.published_at))}
                      </p>
                    )}
                    <h2
                      className="text-2xl font-semibold text-spo-ink transition-colors group-hover:text-spo-green-deep sm:text-3xl"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {locale === "ar" ? featured.title_ar : featured.title_en}
                    </h2>
                    {(locale === "ar" ? featured.excerpt_ar : featured.excerpt_en) && (
                      <p className="line-clamp-3 text-sm text-spo-ink-2">
                        {locale === "ar"
                          ? featured.excerpt_ar
                          : featured.excerpt_en}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            )}

            {/* Grid of the rest */}
            {rest.length > 0 && (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((a) => {
                  const title = locale === "ar" ? a.title_ar : a.title_en;
                  const excerpt = locale === "ar" ? a.excerpt_ar : a.excerpt_en;
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/news/${a.slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-card border border-spo-line bg-white transition-all hover:-translate-y-0.5 hover:border-spo-green/40 hover:shadow-[var(--shadow-2)]"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden bg-spo-green-soft">
                          {a.cover_image_path ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={a.cover_image_path}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div
                              aria-hidden="true"
                              className="flex h-full w-full items-center justify-center text-2xl text-spo-green-deep/30"
                              style={{ fontFamily: "var(--font-display)" }}
                            >
                              {(locale === "ar"
                                ? tenant.name_ar
                                : tenant.name_en
                              ).slice(0, 1)}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-2 p-5">
                          {a.published_at && (
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-spo-muted">
                              {dateFmt.format(new Date(a.published_at))}
                            </p>
                          )}
                          <h3 className="text-lg font-semibold text-spo-ink transition-colors group-hover:text-spo-green-deep">
                            {title}
                          </h3>
                          {excerpt && (
                            <p className="line-clamp-2 text-sm text-spo-ink-2">
                              {excerpt}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
