import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { PublicShell } from "@/components/PublicShell";
import { MatchCountdown } from "@/components/fans/MatchCountdown";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

export default async function ClubLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "fansLanding" });

  const tenant = await resolvePublicTenant();
  if (!tenant) notFound();

  const admin = createServiceRoleClient();

  // Fetch hero org details (tagline, branding) + next match + news + roster
  // + products + about + per-org fan-portal settings in parallel. Each can
  // be empty without breaking the page — sections render with their own
  // empty states (or stay hidden if disabled in settings).
  const nowIso = new Date().toISOString();
  const [
    { data: orgRow },
    { data: settings },
    { data: nextFixtureRows },
    { data: newsRows },
    { data: rosterRows },
    { data: productRows },
    { data: aboutPage },
  ] = await Promise.all([
    admin
      .from("organizations")
      .select("tagline_ar, tagline_en, logo_path, primary_color")
      .eq("id", tenant.org_id)
      .maybeSingle(),
    admin
      .from("fan_portal_settings")
      .select(
        "hero_enabled, next_match_enabled, news_enabled, squad_enabled, shop_enabled, about_enabled, featured_news_id, featured_product_id",
      )
      .eq("org_id", tenant.org_id)
      .maybeSingle(),
    admin
      .from("fixtures")
      .select("id, opponent_ar, opponent_en, kickoff_at, venue, status")
      .eq("org_id", tenant.org_id)
      .eq("status", "scheduled")
      .gte("kickoff_at", nowIso)
      .order("kickoff_at", { ascending: true })
      .limit(1),
    admin
      .from("news_articles")
      .select("id, slug, title_ar, title_en, excerpt_ar, excerpt_en, cover_image_path, published_at")
      .eq("org_id", tenant.org_id)
      .not("published_at", "is", null)
      .lte("published_at", nowIso)
      .order("published_at", { ascending: false })
      .limit(6),
    admin
      .from("roster_entries")
      .select("id, full_name_ar, full_name_en, jersey_number, position, photo_path")
      .eq("org_id", tenant.org_id)
      .eq("active", true)
      .order("jersey_number", { ascending: true, nullsFirst: false })
      .limit(4),
    admin
      .from("products")
      .select("id, name_ar, name_en, description_ar, description_en")
      .eq("org_id", tenant.org_id)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("public_pages")
      .select("title_ar, title_en, body_ar, body_en")
      .eq("org_id", tenant.org_id)
      .eq("slug", "about")
      .eq("published", true)
      .maybeSingle(),
  ]);

  // Default = everything visible (matches Phase 4 behaviour for tenants
  // that haven't visited the Fan portal manager yet).
  const show = {
    hero: settings?.hero_enabled ?? true,
    nextMatch: settings?.next_match_enabled ?? true,
    news: settings?.news_enabled ?? true,
    squad: settings?.squad_enabled ?? true,
    shop: settings?.shop_enabled ?? true,
    about: settings?.about_enabled ?? true,
  };

  const nextFixture = nextFixtureRows?.[0] ?? null;

  // Promote the pinned news / product to position 0, then take the first 3 /
  // 4 of the resulting list. Cap fetched rows at 6 / 8 above so a pin near
  // the bottom of the feed still bubbles up.
  function promote<T extends { id: string }>(
    rows: T[],
    pinnedId: string | null | undefined,
    keep: number,
  ): T[] {
    if (!pinnedId) return rows.slice(0, keep);
    const pinned = rows.find((r) => r.id === pinnedId);
    if (!pinned) return rows.slice(0, keep);
    const rest = rows.filter((r) => r.id !== pinnedId);
    return [pinned, ...rest].slice(0, keep);
  }

  const news = promote(
    newsRows ?? [],
    settings?.featured_news_id as string | null,
    3,
  );
  const products = promote(
    productRows ?? [],
    settings?.featured_product_id as string | null,
    4,
  );
  const roster = rosterRows ?? [];

  const orgName = locale === "ar" ? tenant.name_ar : tenant.name_en;
  const tagline = locale === "ar"
    ? (orgRow?.tagline_ar as string | null) ?? null
    : (orgRow?.tagline_en as string | null) ?? null;
  const logoUrl = orgRow?.logo_path
    ? admin.storage.from("org-branding").getPublicUrl(orgRow.logo_path as string).data.publicUrl
    : null;
  const primaryColor = (orgRow?.primary_color as string | null) ?? null;

  return (
    <PublicShell locale={locale} tenant={tenant}>
      {/* Hero */}
      {show.hero && (
      <section
        className="border-b border-spo-line bg-white"
        style={primaryColor ? { backgroundImage: `linear-gradient(180deg, ${primaryColor}10, transparent 80%)` } : undefined}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between md:py-24">
          <div className="max-w-2xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
              {t("hero.eyebrow")}
            </p>
            <h1
              className="text-4xl font-semibold text-spo-ink sm:text-5xl md:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {orgName}
            </h1>
            {tagline && (
              <p className="max-w-xl text-lg text-spo-ink-2 sm:text-xl">{tagline}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Link href="/sign-in">
                <Button size="lg">{t("hero.memberPortal")}</Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="secondary">{t("hero.becomeMember")}</Button>
              </Link>
            </div>
          </div>
          {logoUrl && (
            <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-card border border-spo-line bg-white sm:h-40 sm:w-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={orgName}
                className="h-full w-full object-contain"
              />
            </div>
          )}
        </div>
      </section>
      )}

      {/* Next match */}
      {show.nextMatch && nextFixture && (
        <section className="bg-spo-green-soft">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-10 sm:px-6 md:flex-row md:items-center">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
                {t("nextMatch.eyebrow")}
              </p>
              <h2
                className="text-2xl font-semibold text-spo-ink sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {orgName} <span className="text-spo-muted">vs</span>{" "}
                {locale === "ar" ? nextFixture.opponent_ar : nextFixture.opponent_en}
              </h2>
              {nextFixture.venue && (
                <p className="text-sm text-spo-muted">{nextFixture.venue}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <MatchCountdown
                kickoffIso={nextFixture.kickoff_at as string}
                locale={locale as "ar" | "en"}
              />
              <Link href={`/fixtures/${nextFixture.id}/buy`}>
                <Button>{t("nextMatch.buyTickets")}</Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* News */}
      {show.news && news.length > 0 && (
        <section className="border-b border-spo-line bg-white">
          <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
                  {t("news.eyebrow")}
                </p>
                <h2
                  className="text-2xl font-semibold text-spo-ink sm:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t("news.title")}
                </h2>
              </div>
              <Link href="/news" className="text-sm text-spo-green-deep hover:underline">
                {t("common.viewAll")}
              </Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {news.map((a) => {
                const title = locale === "ar" ? a.title_ar : a.title_en;
                const excerpt = locale === "ar" ? a.excerpt_ar : a.excerpt_en;
                return (
                  <li key={a.id}>
                    <Link
                      href={`/news/${a.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-card border border-spo-line bg-white transition-colors hover:border-spo-green/40"
                    >
                      <div className="relative aspect-[16/10] bg-spo-green-soft">
                        {a.cover_image_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.cover_image_path as string}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-5">
                        <h3 className="text-lg font-semibold text-spo-ink transition-colors group-hover:text-spo-green-deep">
                          {title}
                        </h3>
                        {excerpt && (
                          <p className="line-clamp-2 text-sm text-spo-ink-2">{excerpt}</p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Squad */}
      {show.squad && roster.length > 0 && (
        <section className="bg-spo-paper-warm">
          <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
                  {t("squad.eyebrow")}
                </p>
                <h2
                  className="text-2xl font-semibold text-spo-ink sm:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t("squad.title")}
                </h2>
              </div>
              <Link href="/squads" className="text-sm text-spo-green-deep hover:underline">
                {t("common.viewAll")}
              </Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {roster.map((r) => (
                <li
                  key={r.id}
                  className="rounded-card border border-spo-line bg-white p-5"
                >
                  <div className="mb-3 flex h-32 w-full items-center justify-center overflow-hidden rounded-md bg-spo-green-soft">
                    {r.photo_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.photo_path as string}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span
                        className="text-4xl text-spo-green-deep/40"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {r.jersey_number ?? "?"}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-semibold text-spo-ink">
                      {locale === "ar" ? r.full_name_ar : r.full_name_en ?? r.full_name_ar}
                    </div>
                    <div className="text-xs text-spo-muted">
                      {r.position ?? ""}
                      {r.jersey_number ? ` · #${r.jersey_number}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Shop */}
      {show.shop && products.length > 0 && (
        <section className="border-b border-spo-line bg-white">
          <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
                  {t("shop.eyebrow")}
                </p>
                <h2
                  className="text-2xl font-semibold text-spo-ink sm:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t("shop.title")}
                </h2>
              </div>
              <Link href="/shop" className="text-sm text-spo-green-deep hover:underline">
                {t("common.viewAll")}
              </Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p) => {
                const name = locale === "ar" ? p.name_ar : p.name_en;
                return (
                  <li key={p.id}>
                    <Link
                      href={`/shop/${p.id}`}
                      className="group flex h-full flex-col overflow-hidden rounded-card border border-spo-line bg-white transition-colors hover:border-spo-green/40"
                    >
                      <div className="aspect-square bg-spo-green-soft" />
                      <div className="p-4">
                        <div className="font-medium text-spo-ink transition-colors group-hover:text-spo-green-deep">
                          {name}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* About */}
      {show.about && aboutPage && (
        <section className="bg-spo-paper-warm">
          <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 sm:px-6">
            <h2
              className="text-2xl font-semibold text-spo-ink sm:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {locale === "ar" ? aboutPage.title_ar : aboutPage.title_en}
            </h2>
            <div className="prose prose-sm max-w-none whitespace-pre-line text-spo-ink-2">
              {locale === "ar" ? aboutPage.body_ar : aboutPage.body_en}
            </div>
          </div>
        </section>
      )}
    </PublicShell>
  );
}
