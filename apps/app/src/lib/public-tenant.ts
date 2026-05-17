import { cookies } from "next/headers";

import { createServiceRoleClient } from "@/lib/supabase-server";

export interface PublicTenant {
  org_id: string;
  slug: string;
  name_ar: string;
  name_en: string;
}

// Resolve the tenant for public (unauthenticated) pages from the
// `sporlo-tenant-slug` cookie that proxy.ts sets for tenant subdomains.
// Returns null when the visitor is on a bare host (e.g. sporlo-app.vercel.app)
// — the caller decides whether to show a chooser, redirect, or 404.
export async function resolvePublicTenant(): Promise<PublicTenant | null> {
  const cookieStore = await cookies();
  const slug = cookieStore.get("sporlo-tenant-slug")?.value;
  if (!slug) return null;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("organizations")
    .select("id, slug, name_ar, name_en")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return null;
  return {
    org_id: data.id,
    slug: data.slug,
    name_ar: data.name_ar,
    name_en: data.name_en,
  };
}
