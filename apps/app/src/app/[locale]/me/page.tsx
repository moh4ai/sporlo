import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Calendar, CheckCircle2 } from "lucide-react";

import { Badge, Card } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

export default async function MePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tenant = await getActiveTenant();
  const t = await getTranslations({ locale, namespace: "memberPortal" });

  // Use service-role to fetch member-side data. RLS would also let the
  // signed-in member read their own rows (per 0024), but using service
  // role keeps the queries simple and avoids one round-trip to set the
  // JWT context.
  const admin = createServiceRoleClient();

  const { data: member } = await admin
    .from("members")
    .select(
      "id, full_name_ar, full_name_en, member_number, email, phone, status",
    )
    .eq("user_id", tenant.user_id)
    .maybeSingle();

  if (!member) notFound();

  const [{ data: subs }, { data: payments }, { data: fixtures }, { data: news }] =
    await Promise.all([
      admin
        .from("subscriptions")
        .select(
          "id, status, starts_at, ends_at, plan:plans(name_ar, name_en, price_sar, duration_months)",
        )
        .eq("member_id", member.id)
        .order("created_at", { ascending: false }),
      admin
        .from("payments")
        .select("id, amount_sar, status, paid_at")
        .eq("member_id", member.id)
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(10),
      admin
        .from("fixtures")
        .select("id, opponent_ar, opponent_en, kickoff_at, venue")
        .eq("org_id", tenant.org_id)
        .eq("status", "scheduled")
        .gte("kickoff_at", new Date().toISOString())
        .order("kickoff_at", { ascending: true })
        .limit(3),
      admin
        .from("news_articles")
        .select("id, slug, title_ar, title_en, excerpt_ar, excerpt_en, published_at")
        .eq("org_id", tenant.org_id)
        .not("published_at", "is", null)
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(3),
    ]);

  const activeSub = (subs ?? []).find((s) => s.status === "active");
  const activePlan = activeSub
    ? Array.isArray(activeSub.plan)
      ? activeSub.plan[0]
      : activeSub.plan
    : null;
  const activePlanName = activePlan
    ? locale === "ar"
      ? activePlan.name_ar
      : activePlan.name_en
    : null;

  const memberName =
    locale === "ar"
      ? member.full_name_ar
      : member.full_name_en || member.full_name_ar;

  const sarFmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  });
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      {/* Hero */}
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
          {t("hero.eyebrow")}
        </p>
        <h1
          className="text-3xl font-semibold text-spo-ink sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("hero.greeting", { name: memberName })}
        </h1>
        {member.member_number && (
          <p className="text-sm text-spo-muted">
            {t("hero.memberNumber")}:{" "}
            <span className="font-mono">{member.member_number}</span>
          </p>
        )}
      </header>

      {/* Subscription card */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-spo-muted">
              {t("subscription.title")}
            </p>
            {activeSub && activePlanName ? (
              <>
                <h2
                  className="text-xl font-semibold text-spo-ink"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {activePlanName}
                </h2>
                <p className="text-sm text-spo-muted">
                  {t("subscription.expires")}{" "}
                  {activeSub.ends_at
                    ? dateFmt.format(new Date(activeSub.ends_at as string))
                    : "—"}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-spo-ink">
                  {t("subscription.none")}
                </h2>
                <p className="text-sm text-spo-muted">{t("subscription.noneHint")}</p>
              </>
            )}
          </div>
          {activeSub ? (
            <Badge tone="green">{t("subscription.statusActive")}</Badge>
          ) : (
            <Badge tone="neutral">{t("subscription.statusNone")}</Badge>
          )}
        </div>
      </Card>

      {/* Upcoming fixtures */}
      {fixtures && fixtures.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-spo-ink">
            {t("fixtures.title")}
          </h2>
          <ul className="space-y-2">
            {fixtures.map((f) => (
              <li key={f.id}>
                <Card>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-full bg-spo-green-soft text-spo-green-deep">
                        <Calendar className="size-4" />
                      </span>
                      <div>
                        <p className="font-medium text-spo-ink">
                          vs{" "}
                          {locale === "ar"
                            ? (f.opponent_ar as string)
                            : (f.opponent_en as string)}
                        </p>
                        <p className="text-xs text-spo-muted">
                          {dateFmt.format(new Date(f.kickoff_at as string))}
                          {f.venue ? ` · ${f.venue}` : ""}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/fixtures/${f.id}/buy`}
                      className="text-sm text-spo-green-deep hover:underline"
                    >
                      {t("fixtures.buyTickets")} →
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Payments */}
      {payments && payments.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-spo-ink">
            {t("payments.title")}
          </h2>
          <Card>
            <ol className="space-y-3">
              {payments.map((p, i) => (
                <li
                  key={p.id}
                  className={
                    "flex items-center justify-between gap-3 " +
                    (i !== payments.length - 1
                      ? "border-b border-spo-line pb-3"
                      : "")
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-spo-green-soft text-spo-green-deep">
                      <CheckCircle2 className="size-3.5" />
                    </span>
                    <span className="text-sm text-spo-ink-2">
                      {p.paid_at
                        ? dateFmt.format(new Date(p.paid_at as string))
                        : "—"}
                    </span>
                  </div>
                  <span className="font-medium text-spo-ink">
                    {sarFmt.format(Number(p.amount_sar))}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      )}

      {/* News */}
      {news && news.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-spo-ink">
            {t("news.title")}
          </h2>
          <ul className="space-y-2">
            {news.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/news/${n.slug}`}
                  className="block rounded-card border border-spo-line bg-white p-4 transition-colors hover:border-spo-green/40"
                >
                  <p className="text-sm font-medium text-spo-ink">
                    {locale === "ar" ? (n.title_ar as string) : (n.title_en as string)}
                  </p>
                  {(locale === "ar" ? n.excerpt_ar : n.excerpt_en) && (
                    <p className="mt-1 line-clamp-2 text-xs text-spo-muted">
                      {locale === "ar"
                        ? (n.excerpt_ar as string)
                        : (n.excerpt_en as string)}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
