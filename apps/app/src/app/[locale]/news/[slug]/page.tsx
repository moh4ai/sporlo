import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Link } from "@/i18n/navigation";
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
    .select("title_ar, title_en, body_ar, body_en, cover_image_path, published_at")
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
  const orgName = locale === "ar" ? tenant.name_ar : tenant.name_en;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <p className="text-sm text-spo-muted">
        <Link href="/news" className="hover:underline">
          ← {orgName}
        </Link>
      </p>

      <article className="space-y-4">
        {data.published_at && (
          <p className="text-xs uppercase tracking-wide text-spo-muted">
            {dateFmt.format(new Date(data.published_at))}
          </p>
        )}
        <h1
          className="text-4xl font-semibold text-spo-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h1>
        {body && (
          <div className="prose prose-spo max-w-none whitespace-pre-wrap text-spo-ink">
            {body}
          </div>
        )}
      </article>
    </main>
  );
}
