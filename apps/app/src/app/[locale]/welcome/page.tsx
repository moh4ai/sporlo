import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { PublicShell } from "@/components/PublicShell";
import { MatchCountdown } from "@/components/fans/MatchCountdown";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicMediaSrc } from "@/lib/public-media";
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
    { data: galleryRows },
  ] = await Promise.all([
    admin
      .from("organizations")
      .select(
        "tagline_ar, tagline_en, logo_path, primary_color, social_jsonb, app_store_url, play_store_url, newsletter_provider, welcome_hero_image_path",
      )
      .eq("id", tenant.org_id)
      .maybeSingle(),
    admin
      .from("fan_portal_settings")
      .select(
        "hero_enabled, next_match_enabled, news_enabled, squad_enabled, shop_enabled, about_enabled, match_center_enabled, honours_enabled, sponsors_enabled, galleries_enabled, featured_news_id, featured_product_id",
      )
      .eq("org_id", tenant.org_id)
      .maybeSingle(),
    admin
      .from("fixtures")
      .select("id, opponent_ar, opponent_en, opponent_logo_path, kickoff_at, venue, status")
      .eq("org_id", tenant.org_id)
      .eq("status", "scheduled")
      .gte("kickoff_at", nowIso)
      .order("kickoff_at", { ascending: true })
      .limit(1),
    admin
      .from("fixtures")
      .select("id, opponent_ar, opponent_en, opponent_logo_path, kickoff_at, venue, status, home_score, away_score")
      .eq("org_id", tenant.org_id)
      .eq("status", "completed")
      .lt("kickoff_at", nowIso)
      .order("kickoff_at", { ascending: false })
      .limit(1),
    admin
      .from("fixtures")
      .select("id, opponent_ar, opponent_en, opponent_logo_path, kickoff_at, venue, status, home_score, away_score")
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
      .select("id, squad_id, full_name_ar, full_name_en, jersey_number, position, photo_path")
      .eq("org_id", tenant.org_id)
      .eq("active", true)
      .order("jersey_number", { ascending: true, nullsFirst: false })
      .limit(4),
    admin
      .from("products")
      .select(
        "id, name_ar, name_en, description_ar, description_en, image_path, image_paths",
      )
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
    admin
      .from("media_galleries")
      .select("id, title_ar, title_en, cover_image_path")
      .eq("org_id", tenant.org_id)
      .not("published_at", "is", null)
      .lte("published_at", nowIso)
      .order("display_order", { ascending: true })
      .order("published_at", { ascending: false })
      .limit(6),
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
    galleries: settings?.galleries_enabled ?? true,
  };

  const nextFixture = nextFixtureRows?.[0] ?? null;
  const lastFixture = lastFixtureRows?.[0] ?? null;
  const honours = honoursRows ?? [];
  const sponsors = sponsorsRows ?? [];
  const galleries = (galleryRows ?? []).map((g) => {
    const path = g.cover_image_path as string | null;
    const url = path
      ? admin.storage.from("media-galleries").getPublicUrl(path).data.publicUrl
      : null;
    return {
      id: g.id as string,
      title_ar: g.title_ar as string,
      title_en: g.title_en as string,
      cover_url: url,
    };
  });

  // Look up a linked match report for the last fixture (if one exists).
  // Cheap second-pass query — single row, indexed lookup. Keeps the main
  // Promise.all simple instead of forking on lastFixture existence.
  let lastFixtureReportSlug: string | null = null;
  if (lastFixture) {
    const { data: report } = await admin
      .from("news_articles")
      .select("slug")
      .eq("fixture_id", lastFixture.id)
      .eq("category", "match_report")
      .not("published_at", "is", null)
      .lte("published_at", nowIso)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    lastFixtureReportSlug = (report?.slug as string | null) ?? null;
  }

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

  // Resolve an opponent_logo_path (storage path under org-branding) to a
  // public URL. Same pattern as the org logo above.
  function opponentLogoUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    return admin.storage.from("org-branding").getPublicUrl(path).data.publicUrl;
  }

  // Last 3 results + next 3 scheduled for the Match Center mini-table.
  const seasonRows = (seasonFixtureRows ?? []) as Array<{
    id: string;
    opponent_ar: string;
    opponent_en: string;
    opponent_logo_path: string | null;
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
  const heroImageUrl = orgRow?.welcome_hero_image_path
    ? admin.storage
        .from("org-branding")
        .getPublicUrl(orgRow.welcome_hero_image_path as string).data.publicUrl
    : null;
  const primaryColor = (orgRow?.primary_color as string | null) ?? null;

  return (
    <PublicShell locale={locale} tenant={tenant}>
      {/* Hero — lets the org's primary colour do the visual lift,
          with a larger logo treatment and two clearly-differentiated CTAs. */}
      {show.hero && (
        <section
          className="relative overflow-hidden bg-white"
          style={
            !heroImageUrl && primaryColor
              ? {
                  // Stronger top tint (30% → transparent) plus a soft radial
                  // around the logo for depth on bare-tenant setups without
                  // a hero photo.
                  backgroundImage: `linear-gradient(180deg, ${primaryColor}30 0%, transparent 60%)`,
                }
              : undefined
          }
        >
          {heroImageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImageUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* Dual overlay — dark vignette for legibility + brand-tinted
                  wash on top so the org's primary colour still reads. */}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-b from-spo-ink/65 via-spo-ink/45 to-spo-ink/75"
              />
              {primaryColor && (
                <div
                  aria-hidden
                  className="absolute inset-0 mix-blend-multiply opacity-40"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor} 0%, transparent 60%)`,
                  }}
                />
              )}
            </>
          )}
          {!heroImageUrl && primaryColor && (
            <div
              aria-hidden
              className="absolute -end-32 -top-32 h-96 w-96 rounded-full opacity-40 blur-3xl"
              style={{ backgroundColor: primaryColor }}
            />
          )}
          <div
            className={
              "relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between md:py-24 " +
              (heroImageUrl ? "text-white" : "")
            }
          >
            <div className="max-w-2xl space-y-4">
              <p
                className={
                  "text-xs font-semibold uppercase tracking-wider " +
                  (heroImageUrl ? "text-white/85" : "text-spo-green-deep")
                }
              >
                {t("hero.eyebrow")}
              </p>
              <h1
                className={
                  "text-4xl font-semibold sm:text-5xl md:text-6xl " +
                  (heroImageUrl ? "text-white drop-shadow-lg" : "text-spo-ink")
                }
                style={{ fontFamily: "var(--font-display)" }}
              >
                {orgName}
              </h1>
              {tagline && (
                <p
                  className={
                    "max-w-xl text-lg sm:text-xl " +
                    (heroImageUrl ? "text-white/90" : "text-spo-ink-2")
                  }
                >
                  {tagline}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Link href="/membership">
                  <Button size="lg">{t("hero.becomeMember")}</Button>
                </Link>
                <Link href="/sign-in">
                  <Button size="lg" variant="secondary">{t("hero.memberPortal")}</Button>
                </Link>
              </div>
            </div>
            {logoUrl && (
              <div
                className="relative flex h-44 w-44 shrink-0 items-center justify-center overflow-hidden rounded-card border border-spo-line bg-white shadow-[var(--shadow-2)] sm:h-56 sm:w-56"
                style={
                  primaryColor
                    ? { boxShadow: `0 12px 32px -12px ${primaryColor}50` }
                    : undefined
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={orgName}
                  className="h-full w-full object-contain p-3"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Next match — a slim accent band between the hero and the long
          stack of content sections; tighter padding by design. */}
      {show.nextMatch && nextFixture && (
        <section className="bg-spo-green-soft">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:py-10">
            <div className="flex items-center gap-4">
              {(() => {
                const url = opponentLogoUrl(
                  nextFixture.opponent_logo_path as string | null,
                );
                return url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt=""
                    className="size-14 shrink-0 rounded-full border border-spo-line bg-white p-1 shadow-[var(--shadow-1)] sm:size-16"
                  />
                ) : null;
              })()}
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
        <section className="bg-white">
          <div className="mx-auto max-w-6xl space-y-8 px-4 py-16 sm:px-6 sm:py-20">
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
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  {(() => {
                    const url = opponentLogoUrl(
                      lastFixture.opponent_logo_path as string | null,
                    );
                    return url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt=""
                        className="size-12 shrink-0 rounded-full border border-spo-line bg-white p-0.5"
                      />
                    ) : null;
                  })()}
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
                {lastFixtureReportSlug && (
                  <Link
                    href={`/news/${lastFixtureReportSlug}`}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-spo-green-deep hover:underline"
                  >
                    {t("matchCenter.readReport")} →
                  </Link>
                )}
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
                      {recentResults.map((f) => {
                        const logo = opponentLogoUrl(f.opponent_logo_path);
                        return (
                          <li
                            key={f.id}
                            className="flex items-center justify-between gap-2 px-4 py-2 text-sm"
                          >
                            <span className="flex min-w-0 items-center gap-2 truncate text-spo-ink-2">
                              {logo && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={logo}
                                  alt=""
                                  className="size-6 shrink-0 rounded-full border border-spo-line bg-white"
                                />
                              )}
                              <span className="truncate">
                                {locale === "ar" ? f.opponent_ar : f.opponent_en}
                              </span>
                            </span>
                            <span className="font-mono text-xs text-spo-ink">
                              {f.home_score ?? 0}–{f.away_score ?? 0}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {upcomingSeason.length > 0 && (
                  <div className="rounded-card border border-spo-line bg-white">
                    <p className="border-b border-spo-line px-4 py-2 text-xs font-semibold uppercase tracking-wider text-spo-muted">
                      {t("matchCenter.upcoming")}
                    </p>
                    <ul className="divide-y divide-spo-line">
                      {upcomingSeason.map((f) => {
                        const logo = opponentLogoUrl(f.opponent_logo_path);
                        return (
                          <li
                            key={f.id}
                            className="flex items-center justify-between gap-2 px-4 py-2 text-sm"
                          >
                            <span className="flex min-w-0 items-center gap-2 truncate text-spo-ink-2">
                              {logo && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={logo}
                                  alt=""
                                  className="size-6 shrink-0 rounded-full border border-spo-line bg-white"
                                />
                              )}
                              <span className="truncate">
                                {locale === "ar" ? f.opponent_ar : f.opponent_en}
                              </span>
                            </span>
                            <span className="text-xs text-spo-muted">
                              {new Date(f.kickoff_at as string).toLocaleDateString(
                                locale === "ar" ? "ar-SA" : "en-GB",
                                { month: "short", day: "numeric" },
                              )}
                            </span>
                          </li>
                        );
                      })}
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
        <section className="bg-spo-paper-warm">
          <div className="mx-auto max-w-6xl space-y-8 px-4 py-16 sm:px-6 sm:py-20">
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
                const coverSrc = resolvePublicMediaSrc(
                  a.cover_image_path as string | null,
                  admin,
                  "news-covers",
                );
                return (
                  <li key={a.id}>
                    <Link
                      href={`/news/${a.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-card border border-spo-line bg-white transition-all hover:-translate-y-0.5 hover:border-spo-green/40 hover:shadow-[var(--shadow-2)]"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-spo-green-soft">
                        {coverSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={coverSrc}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
        <section className="bg-white">
          <div className="mx-auto max-w-6xl space-y-8 px-4 py-16 sm:px-6 sm:py-20">
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
              {roster.map((r) => {
                const photoSrc = resolvePublicMediaSrc(
                  r.photo_path as string | null,
                  admin,
                  "roster-photos",
                );
                return (
                <li key={r.id}>
                  <Link
                    href={`/squads/${r.squad_id}/players/${r.id}`}
                    className="group block rounded-card border border-spo-line bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-spo-green/40 hover:shadow-[var(--shadow-2)]"
                  >
                    <div className="mb-3 flex h-32 w-full items-center justify-center overflow-hidden rounded-md bg-spo-green-soft">
                      {photoSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoSrc}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
                      <div className="font-semibold text-spo-ink transition-colors group-hover:text-spo-green-deep">
                        {locale === "ar" ? r.full_name_ar : r.full_name_en ?? r.full_name_ar}
                      </div>
                      <div className="text-xs text-spo-muted">
                        {r.position ?? ""}
                        {r.jersey_number ? ` · #${r.jersey_number}` : ""}
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

      {/* Shop */}
      {show.shop && products.length > 0 && (
        <section className="bg-spo-paper-warm">
          <div className="mx-auto max-w-6xl space-y-8 px-4 py-16 sm:px-6 sm:py-20">
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
                const paths: string[] = Array.isArray(p.image_paths)
                  ? (p.image_paths as string[])
                  : [];
                const coverPath =
                  paths[0] ?? (p.image_path as string | null) ?? null;
                const imageUrl = resolvePublicMediaSrc(
                  coverPath,
                  admin,
                  "product-images",
                );
                return (
                  <li key={p.id}>
                    <Link
                      href={`/shop/${p.id}`}
                      className="group flex h-full flex-col overflow-hidden rounded-card border border-spo-line bg-white transition-all hover:-translate-y-0.5 hover:border-spo-green/40 hover:shadow-[var(--shadow-2)]"
                    >
                      <div className="aspect-square overflow-hidden bg-spo-paper-warm">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageUrl}
                            alt={name ?? ""}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div
                            aria-hidden
                            className="flex h-full w-full items-center justify-center text-3xl text-spo-green-deep/20"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {(name ?? "—").slice(0, 1)}
                          </div>
                        )}
                      </div>
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

      {/* Honours — trophy cabinet. Dark backdrop is intentional (premium feel);
          cards mimic trophy plinths with an amber rim. */}
      {show.honours && honours.length > 0 && (
        <section className="relative overflow-hidden bg-spo-ink text-white">
          {/* Subtle radial behind the cards to add depth on the flat dark. */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-spo-amber/10 to-transparent"
          />
          <div className="relative mx-auto max-w-6xl space-y-8 px-4 py-16 sm:px-6 sm:py-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-spo-amber">
                {t("honours.eyebrow")}
              </p>
              <h2
                className="text-2xl font-semibold sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t("honours.titleWith", { club: orgName })}
              </h2>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {honours.map((h) => (
                <li
                  key={h.id}
                  className="group relative flex flex-col items-center gap-2 overflow-hidden rounded-card border border-white/10 bg-white/[0.04] p-4 text-center transition-all hover:-translate-y-0.5 hover:border-spo-amber/40 hover:bg-white/[0.06]"
                >
                  {/* Amber rim on top — the "trophy plinth" gold band. */}
                  <span
                    aria-hidden
                    className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-spo-amber/60 to-transparent"
                  />
                  <span
                    className="text-4xl font-bold text-spo-amber sm:text-5xl"
                    style={{
                      fontFamily: "var(--font-display)",
                      textShadow: "0 2px 12px rgba(245, 197, 24, 0.25)",
                    }}
                  >
                    {h.win_count}
                  </span>
                  <span className="text-xs font-medium leading-tight text-white/90">
                    {locale === "ar" ? h.competition_ar : h.competition_en}
                  </span>
                  {h.last_won_year && (
                    <span className="text-[10px] uppercase tracking-wider text-white/40">
                      {t("honours.lastWon", { year: h.last_won_year })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Sponsors — multi-tier partner grid. Tier weight is visible: strategic
          sponsors get bigger cards + fewer per row; supporters get small cards
          packed dense. Clubs pay for tier — the page should reflect it. */}
      {show.sponsors && sponsors.length > 0 && (() => {
        // Per-tier display config: card height, columns at each breakpoint.
        const TIER_LAYOUT: Record<
          "strategic" | "main" | "official" | "supporter",
          { h: string; cols: string }
        > = {
          strategic: { h: "h-32 sm:h-36", cols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" },
          main: { h: "h-24 sm:h-28", cols: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" },
          official: { h: "h-20 sm:h-24", cols: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-5" },
          supporter: { h: "h-16 sm:h-20", cols: "grid-cols-3 sm:grid-cols-5 lg:grid-cols-8" },
        };
        return (
          <section className="bg-white">
            <div className="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:px-6 sm:py-20">
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
                const layout = TIER_LAYOUT[tier];
                return (
                  <div key={tier} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="h-px flex-1 bg-spo-line" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-spo-ink-2">
                        {t(`sponsors.tiers.${tier}`)}
                      </span>
                      <span className="h-px flex-1 bg-spo-line" />
                    </div>
                    <ul className={`grid gap-3 sm:gap-4 ${layout.cols}`}>
                      {list.map((s) => {
                        const logo = sponsorLogoUrl(s.logo_path as string | null);
                        const inner = (
                          <span
                            className={`flex ${layout.h} w-full items-center justify-center overflow-hidden rounded-card border border-spo-line bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-spo-green/40 hover:shadow-[var(--shadow-2)]`}
                          >
                            {logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={logo}
                                alt={(locale === "ar" ? s.name_ar : s.name_en) as string}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <span className="text-center text-xs font-medium text-spo-ink-2">
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
        );
      })()}

      {/* Galleries — behind-the-scenes */}
      {show.galleries && galleries.length > 0 && (
        <section className="bg-spo-paper-warm">
          <div className="mx-auto max-w-6xl space-y-8 px-4 py-16 sm:px-6 sm:py-20">
            <header className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
                  {t("galleries.eyebrow")}
                </p>
                <h2
                  className="text-2xl font-semibold text-spo-ink sm:text-3xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t("galleries.title")}
                </h2>
              </div>
              <Link
                href="/galleries"
                className="text-sm font-medium text-spo-green-deep hover:underline"
              >
                {t("galleries.viewAll")} →
              </Link>
            </header>
            <ul className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible lg:grid-cols-3">
              {galleries.slice(0, 6).map((g) => (
                <li
                  key={g.id}
                  className="min-w-[80%] flex-shrink-0 snap-start px-1 sm:min-w-0 sm:px-0"
                >
                  <Link
                    href={`/galleries/${g.id}`}
                    className="group block overflow-hidden rounded-card border border-spo-line bg-white transition-all hover:-translate-y-0.5 hover:border-spo-green/40 hover:shadow-[var(--shadow-2)]"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-spo-paper">
                      {g.cover_url ? (
                        // Bypass the Next image optimizer — Supabase Storage URLs
                        // are public CDN, no need to proxy through /_next/image.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={g.cover_url}
                          alt={locale === "ar" ? g.title_ar : g.title_en}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-spo-muted">
                          {t("galleries.noCover")}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 p-3">
                      <h3 className="line-clamp-2 text-sm font-medium text-spo-ink">
                        {locale === "ar" ? g.title_ar : g.title_en}
                      </h3>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* About */}
      {show.about && aboutPage && (
        <section className="bg-white">
          <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 sm:px-6 sm:py-20">
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
