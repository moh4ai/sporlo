import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  HospitalityClient,
  type PackageRow,
} from "./_components/HospitalityClient";

export default async function HospitalityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("hospitality_packages")
    .select(
      "id, name_ar, name_en, body_ar, body_en, price_sar, capacity, cover_image_path, fixture_filter, contact_url, display_order, active",
    )
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  const rows: PackageRow[] = (data ?? []).map((p) => {
    let coverUrl: string | null = null;
    if (p.cover_image_path) {
      coverUrl = supabase.storage
        .from("hospitality-covers")
        .getPublicUrl(p.cover_image_path as string).data.publicUrl;
    }
    return {
      id: p.id as string,
      name_ar: p.name_ar as string,
      name_en: p.name_en as string,
      body_ar: (p.body_ar as string | null) ?? "",
      body_en: (p.body_en as string | null) ?? "",
      price_sar: Number(p.price_sar),
      capacity: (p.capacity as number | null) ?? null,
      cover_image_path: (p.cover_image_path as string | null) ?? null,
      cover_url: coverUrl,
      fixture_filter: (p.fixture_filter as "all" | "season" | "specific") ?? "all",
      contact_url: (p.contact_url as string | null) ?? "",
      display_order: (p.display_order as number) ?? 0,
      active: Boolean(p.active),
    };
  });

  return (
    <HospitalityClient
      packages={rows}
      principal={{ role: tenant.user_role, department: tenant.department }}
      locale={locale as "ar" | "en"}
    />
  );
}
