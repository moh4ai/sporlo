import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { PublicShell } from "@/components/PublicShell";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { resolvePublicTenant } from "@/lib/public-tenant";
import type { Locale } from "@/i18n/routing";

export default async function PublicStaticPage({
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
    .from("public_pages")
    .select("title_ar, title_en, body_ar, body_en, hero_image_path")
    .eq("org_id", tenant.org_id)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!data) notFound();

  const title = locale === "ar" ? data.title_ar : data.title_en;
  const body = locale === "ar" ? data.body_ar : data.body_en;

  return (
    <PublicShell locale={locale} tenant={tenant}>
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <header className="space-y-2 pb-6">
          <h1
            className="text-3xl font-semibold text-spo-ink sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h1>
        </header>

        {data.hero_image_path && (
          <div className="-mx-4 mb-8 overflow-hidden rounded-card sm:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.hero_image_path}
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
