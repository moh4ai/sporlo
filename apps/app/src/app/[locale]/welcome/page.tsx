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
    { data: lastFixtureRows },
    { data: seasonFixtureRows },
    { data: newsRows },
    { data: rosterRows },
    { data: productRows },
    { data: aboutPage },
    { data: honoursRows },
    { data: sponsorsRows },
  ] = await Promise.all([
    admin
      .from("organizations")
      .select(
        "tagline_ar, tagline_en, logo_path, primary_color, social_jsonb, app_store_url, play_store_url, newsletter_provider",
      )
      .eq("id", tenant.org_id)
      .maybeSingle(),
    admin
      .from("fan_portal_settings")
      .select(
        "hero_enabled, next_match_enabled, news_enabled, squad_enabled, shop_enabled, about_enabled, match_center_enabled, honours_enabled, sponsors_enabled, featured_news_id, featured_product_id",
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
      .from("fixtures")
      .select("id, opponent_ar, opponent_en, kickoff_at, venue, status, home_score, away_score")
      .eq("org_id", tenant.org_id)
      .eq("status", "completed")
      .lt("kickoff_at", nowIso)
      .order("kickoff_at", { ascending: false })
      .limit(1),
    admin
      .from("fixtures")
      .select("id, opponent_ar, opponent_en, kickoff_at, venue, status, home_score, away_score")
      .eq("org_id", tenant.org_id)
      .order("kickoff_at", { ascending: false })
      .limit(8),
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
    admin
      .from("honours")
      .select("id, competition_ar, competition_en, kind, win_count, last_won_year")
      .eq("org_id", tenant.org_id)
      .order("display_order", { ascending: true })
      .order("win_count", { ascending: false })
      .limit(16),
    admin
      .from("sponsors")
      .select("id, name_ar, name_en, logo_path, url, tier, display_order")
      .eq("org_id", tenant.org_id)
      .eq("active", true)
      .order("tier", { ascending: true })
      .order("display_order", { ascending: true }),
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
    matchCenter: settings?.match_center_enabled ?? true,
    honours: settings?.honours_enabled ?? true,
    sponsors: settings?.sponsors_enabled ?? true,
  };

  const nextFixture = nextFixtureRows?.[0] ?? null;
  const lastFixture = lastFixtureRows?.[0] ?? null;
  const honours = honoursRows ?? [];
  const sponsors = sponsorsRows ?? [];

  // Group sponsors by tier for the multi-row rendering.
  type Tier = "strategic" | "main" | "official" | "supporter";
  const sponsorsByTier = new Map<Tier, typeof sponsors>();
  for (const s of sponsors) {
    const tier = s.tier as Tier;
    if (!sponsorsByTier.has(tier)) sponsorsByTier.set(tier, []);
    sponsorsByTier.get(tier)!.push(s);
  }
  const tierOrder: Tier[] = ["strategic", "main", "official", "supporter"];

  // Build the sponsor logo URL resolver. Mirrors the org-branding pattern.
  function sponsorLogoUrl(path: string | null): string | null {
    if (!path) return null;
    return admin.storage.from("sponsor-logos").getPublicUrl(path).data.publicUrl;
  }

  // Last 3 results + next 3 scheduled for the Match Center mini-table.
  const seasonRows = (seasonFixtureRows ?? []) as Array<{
    id: string;
    opponent_ar: string;
    opponent_en: string;
    kickoff_at: string;
    venue: string | null;
    status: string;
    home_score: number | null;
    away_score: number | null;
  }>;
  const recentResults = seasonRows
    .filter((f) => f.status === "completed")
    .slice(0, 3);
  const upcomingSeason = seasonRows
    .filter((f) => f.status === "scheduled")
    .reverse()
    .slice(0, 3);

  // Org social/app/newsletter metadata
  const social = (orgRow?.social_jsonb ?? {}) as Record<string, string | undefined>;
  const appStoreUrl = (orgRow?.app_store_url as string | null) ?? null;
  const playStoreUrl = (orgRow?.play_store_url as string | null) ?? null;
  const newsletterEnabled = Boolean(orgRow?.newsletter_provider);

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

      {/* Match Center — last result + season at a glance */}
      {show.matchCenter && (lastFixture || recentResults.length > 0 || upcomingSeason.length > 0) && (
        <section className="border-b border-spo-line bg-white">
          <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
                  {t("matchCenter.eyebrow")}
                </p>
                <h2
                  className="text-2xl font-semibold text-spo-ink sm:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t("matchCenter.title")}
                </h2>
              </div>
              <Link href="/fixtures" className="text-sm text-spo-green-deep hover:underline">
                {t("common.viewAll")}
              </Link>
            </div>

            {lastFixture && (
              <div className="rounded-card-lg border border-spo-line bg-spo-paper-warm p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-spo-muted">
                  {t("matchCenter.lastResult")}
                </p>
                <div className="mt-3 flex flex-wrap items-baseline gap-4">
                  <div className="text-xl font-semibold text-spo-ink sm:text-2xl">
                    {orgName}{" "}
                    <span className="font-mono text-spo-green-deep">
                      {lastFixture.home_score ?? 0} - {lastFixture.away_score ?? 0}
                    </span>{" "}
                    {locale === "ar"
                      ? (lastFixture.opponent_ar as string)
                      : (lastFixture.opponent_en as string)}
                  </div>
                  <ResultBadge
                    home={lastFixture.home_score}
                    away={lastFixture.away_score}
                    t={t}
                  />
                  <span className="text-xs text-spo-muted">
                    {new Date(lastFixture.kickoff_at as string).toLocaleDateString(
                      locale === "ar" ? "ar-SA" : "en-GB",
                      { year: "numeric", month: "short", day: "numeric" },
                    )}
                    {lastFixture.venue ? ` · ${lastFixture.venue}` : ""}
                  </span>
                </div>
              </div>
            )}

            {(recentResults.length > 0 || upcomingSeason.length > 0) && (
              <div className="grid gap-4 md:grid-cols-2">
                {recentResults.length > 0 && (
                  <div className="rounded-card border border-spo-line bg-white">
                    <p className="border-b border-spo-line px-4 py-2 text-xs font-semibold uppercase tracking-wider text-spo-muted">
                      {t("matchCenter.recentResults")}
                    </p>
                    <ul className="divide-y divide-spo-line">
                      {recentResults.map((f) => (
                        <li key={f.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                          <span className="truncate text-spo-ink-2">
                            {locale === "ar" ? f.opponent_ar : f.opponent_en}
                          </span>
                          <span className="font-mono text-xs text-spo-ink">
                            {f.home_score ?? 0}–{f.away_score ?? 0}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {upcomingSeason.length > 0 && (
                  <div className="rounded-card border border-spo-line bg-white">
                    <p className="border-b border-spo-line px-4 py-2 text-xs font-semibold uppercase tracking-wider text-spo-muted">
                      {t("matchCenter.upcoming")}
                    </p>
                    <ul className="divide-y divide-spo-line">
                      {upcomingSeason.map((f) => (
                        <li key={f.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                          <span className="truncate text-spo-ink-2">
                            {locale === "ar" ? f.opponent_ar : f.opponent_en}
                          </span>
                          <span className="text-xs text-spo-muted">
                            {new Date(f.kickoff_at as string).toLocaleDateString(
                              locale === "ar" ? "ar-SA" : "en-GB",
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
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

      {/* Honours — trophy cabinet */}
      {show.honours && honours.length > 0 && (
        <section className="border-b border-spo-line bg-spo-ink py-12 text-white">
          <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-soft/80">
                  {t("honours.eyebrow")}
                </p>
                <h2
                  className="text-2xl font-semibold sm:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t("honours.titleWith", { club: orgName })}
                </h2>
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {honours.map((h) => (
                <li
                  key={h.id}
                  className="flex flex-col items-center gap-1 rounded-card bg-white/5 p-4 text-center backdrop-blur-sm"
                >
                  <span
                    className="text-3xl font-bold text-spo-amber sm:text-4xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {h.win_count}
                  </span>
                  <span className="text-xs font-medium leading-tight">
                    {locale === "ar" ? h.competition_ar : h.competition_en}
                  </span>
                  {h.last_won_year && (
                    <span className="text-[10px] text-white/40">
                      {t("honours.lastWon", { year: h.last_won_year })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Sponsors — multi-tier partner grid */}
      {show.sponsors && sponsors.length > 0 && (
        <section className="border-b border-spo-line bg-white">
          <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
                {t("sponsors.eyebrow")}
              </p>
              <h2
                className="text-2xl font-semibold text-spo-ink sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("sponsors.title")}
              </h2>
            </div>
            {tierOrder.map((tier) => {
              const list = sponsorsByTier.get(tier) ?? [];
              if (list.length === 0) return null;
              return (
                <div key={tier} className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-spo-muted">
                    {t(`sponsors.tiers.${tier}`)}
                  </p>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    {list.map((s) => {
                      const logo = sponsorLogoUrl(s.logo_path as string | null);
                      const inner = (
                        <span className="flex h-20 w-full items-center justify-center overflow-hidden rounded-card border border-spo-line bg-white p-3 transition-colors hover:border-spo-green/40">
                          {logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={logo}
                              alt={(locale === "ar" ? s.name_ar : s.name_en) as string}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <span className="text-xs font-medium text-spo-ink-2">
                              {locale === "ar" ? s.name_ar : s.name_en}
                            </span>
                          )}
                        </span>
                      );
                      return (
                        <li key={s.id}>
                          {s.url ? (
                            <a href={s.url as string} target="_blank" rel="noreferrer" className="block">
                              {inner}
                            </a>
                          ) : (
                            inner
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
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

      {/* Footer CTA — social + apps + newsletter — always-on */}
      <section className="border-t border-spo-line bg-white">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
          {newsletterEnabled && (
            <div className="rounded-card border border-spo-line bg-spo-green-soft/40 p-5 text-center">
              <h3
                className="text-lg font-semibold text-spo-ink sm:text-xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("footerCta.newsletterTitle")}
              </h3>
              <p className="mt-1 text-sm text-spo-muted">{t("footerCta.newsletterHint")}</p>
              <p className="mt-3 text-xs text-spo-muted">{t("footerCta.newsletterPending")}</p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(social).map(([key, url]) => {
                if (!url) return null;
                return (
                  <a
                    key={key}
                    href={url as string}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={key}
                    className="inline-flex size-9 items-center justify-center rounded-md border border-spo-line bg-white text-spo-ink-2 transition-colors hover:bg-spo-paper"
                  >
                    <SocialGlyph kind={key} />
                  </a>
                );
              })}
            </div>
            {(appStoreUrl || playStoreUrl) && (
              <div className="flex items-center gap-2">
                {appStoreUrl && (
                  <a
                    href={appStoreUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-pill border border-spo-line bg-white px-3 py-1.5 text-xs text-spo-ink-2 hover:bg-spo-paper"
                  >
                    {t("footerCta.appStore")}
                  </a>
                )}
                {playStoreUrl && (
                  <a
                    href={playStoreUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-pill border border-spo-line bg-white px-3 py-1.5 text-xs text-spo-ink-2 hover:bg-spo-paper"
                  >
                    {t("footerCta.playStore")}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function ResultBadge({
  home,
  away,
  t,
}: {
  home: number | null;
  away: number | null;
  t: (key: string) => string;
}) {
  if (home == null || away == null) return null;
  const result = home > away ? "win" : home < away ? "loss" : "draw";
  const tone =
    result === "win"
      ? "bg-spo-green text-white"
      : result === "loss"
        ? "bg-spo-danger/15 text-spo-danger"
        : "bg-spo-paper text-spo-ink-2";
  return (
    <span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {t(`matchCenter.result.${result}`)}
    </span>
  );
}

function SocialGlyph({ kind }: { kind: string }) {
  // Tiny inline glyph mapping. Keeps the bundle slim — Lucide doesn't ship
  // all brand icons consistently.
  const label = kind.slice(0, 1).toUpperCase();
  return <span className="text-sm font-semibold">{label}</span>;
}
