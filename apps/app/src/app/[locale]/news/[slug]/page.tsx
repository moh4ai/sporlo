import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { PublicShell } from "@/components/PublicShell";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);

  const tenant = await resolvePublicTenant();
  if (!tenant) notFound();

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("news_articles")
    .select(
      "title_ar, title_en, body_ar, body_en, cover_image_path, published_at",
    )
    .eq("org_id", tenant.org_id)
    .eq("slug", slug)
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (!data) notFound();

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const title = locale === "ar" ? data.title_ar : data.title_en;
  const body = locale === "ar" ? data.body_ar : data.body_en;
  const BackArrow = locale === "ar" ? ArrowRight : ArrowLeft;

  return (
    <PublicShell locale={locale} tenant={tenant}>
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <Link
          href="/news"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-spo-muted hover:text-spo-ink"
        >
          <BackArrow className="size-3.5" />
          <span>{locale === "ar" ? tenant.name_ar : tenant.name_en}</span>
        </Link>

        <header className="space-y-4 pb-6">
          {data.published_at && (
            <p className="text-xs font-semibold uppercase tracking-wider text-spo-green-deep">
              {dateFmt.format(new Date(data.published_at))}
            </p>
          )}
          <h1
            className="text-3xl font-semibold leading-tight text-spo-ink sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h1>
        </header>

        {data.cover_image_path && (
          <div className="-mx-4 mb-8 overflow-hidden rounded-card sm:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.cover_image_path}
              alt=""
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        )}

        {body && (
          <div className="whitespace-pre-wrap text-lg leading-relaxed text-spo-ink-2">
            {body}
          </div>
        )}
      </article>
    </PublicShell>
  );
}
