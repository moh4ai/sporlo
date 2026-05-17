import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

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
  const orgName = locale === "ar" ? tenant.name_ar : tenant.name_en;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <p className="text-sm text-spo-muted">{orgName}</p>
      <article className="space-y-4">
        <h1
          className="text-4xl font-semibold text-spo-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h1>
        {body && (
          <div className="whitespace-pre-wrap text-spo-ink">{body}</div>
        )}
      </article>
    </main>
  );
}
