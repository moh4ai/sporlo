import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Card } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

export default async function PublicNewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "media" });

  const tenant = await resolvePublicTenant();
  if (!tenant) notFound();

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("news_articles")
    .select("id, slug, title_ar, title_en, excerpt_ar, excerpt_en, cover_image_path, published_at")
    .eq("org_id", tenant.org_id)
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(50);

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const orgName = locale === "ar" ? tenant.name_ar : tenant.name_en;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-sm text-spo-muted">{orgName}</p>
        <h1
          className="text-3xl font-semibold text-spo-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("news.title")}
        </h1>
      </header>

      {!data || data.length === 0 ? (
        <Card>
          <p className="text-sm text-spo-muted">{t("news.empty")}</p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {data.map((a) => {
            const title = locale === "ar" ? a.title_ar : a.title_en;
            const excerpt = locale === "ar" ? a.excerpt_ar : a.excerpt_en;
            return (
              <Card key={a.id}>
                <Link href={`/news/${a.slug}`} className="block space-y-2">
                  {a.published_at && (
                    <p className="text-xs uppercase tracking-wide text-spo-muted">
                      {dateFmt.format(new Date(a.published_at))}
                    </p>
                  )}
                  <h2 className="text-xl font-semibold text-spo-ink hover:text-spo-green-deep">
                    {title}
                  </h2>
                  {excerpt && <p className="text-sm text-spo-ink-2">{excerpt}</p>}
                </Link>
              </Card>
            );
          })}
        </ul>
      )}
    </main>
  );
}
