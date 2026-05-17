import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  ScheduleClient,
  type BookingRow,
  type MaintenanceRow,
} from "./_components/ScheduleClient";

interface RawRange {
  time_range: string;
}

function parseRange(raw: string): { starts_at: string; ends_at: string } {
  // tstzrange comes back like "[\"2026-05-20 18:00:00+00\",\"2026-05-20 20:00:00+00\")"
  // Strip brackets/parens and split on comma.
  const inner = raw.replace(/^[\[(]|[\])]$/g, "");
  const [lo, hi] = inner.split(",").map((s) => s.replace(/^"|"$/g, "").trim());
  return {
    starts_at: new Date(lo!).toISOString(),
    ends_at: new Date(hi!).toISOString(),
  };
}

export default async function FacilityDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "facilities" });
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();
  const { data: facility } = await supabase
    .from("facilities")
    .select("id, name_ar, name_en, facility_type, capacity, notes, active")
    .eq("id", id)
    .maybeSingle();
  if (!facility) notFound();

  // Next 7 days window for the schedule view.
  const now = new Date();
  const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60_000);
  const windowLiteral = `[${now.toISOString()},${weekAhead.toISOString()})`;

  const { data: bookingData } = await supabase
    .from("facility_bookings")
    .select("id, time_range, booked_by_name, booked_by_email, status, notes")
    .eq("facility_id", id)
    .overlaps("time_range", windowLiteral);

  const bookings: BookingRow[] = (bookingData ?? []).map((b) => {
    const range = parseRange((b as RawRange).time_range);
    return {
      id: b.id,
      starts_at: range.starts_at,
      ends_at: range.ends_at,
      booked_by_name: b.booked_by_name,
      booked_by_email: b.booked_by_email,
      status: b.status,
      notes: b.notes,
    };
  });
  bookings.sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  const { data: maintenanceData } = await supabase
    .from("maintenance_windows")
    .select("id, time_range, reason")
    .eq("facility_id", id);

  const maintenance: MaintenanceRow[] = (maintenanceData ?? []).map((m) => {
    const range = parseRange((m as RawRange).time_range);
    return {
      id: m.id,
      starts_at: range.starts_at,
      ends_at: range.ends_at,
      reason: m.reason,
    };
  });
  maintenance.sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  const name = locale === "ar" ? facility.name_ar : facility.name_en;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/facilities"
        className="text-sm text-spo-muted hover:text-spo-ink"
      >
        ← {t("common.back")}
      </Link>
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-spo-ink">{name}</h2>
        {facility.facility_type && (
          <p className="text-sm text-spo-muted">{facility.facility_type}</p>
        )}
      </header>

      <ScheduleClient
        facilityId={id}
        bookings={bookings}
        maintenance={maintenance}
        principal={{ role: tenant.user_role, department: tenant.department }}
        locale={locale as "ar" | "en"}
      />
    </div>
  );
}
