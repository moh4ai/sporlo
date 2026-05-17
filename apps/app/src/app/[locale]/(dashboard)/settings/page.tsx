import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  SettingsClient,
  type InitialPrefs,
  type NotificationPrefRow,
  type ProfileRow,
} from "./_components/SettingsClient";

// The five notification events surfaced in Phase 1.3. The emitter side
// reads these toggles in Phase 2; for now they're storage-only.
const NOTIFICATION_EVENTS = [
  "subscription_renewed",
  "refund_requested",
  "booking_conflict",
  "deadline_approaching",
  "certification_expiring",
] as const;

const CHANNELS = ["email", "in_app"] as const;

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tenant = await getActiveTenant();
  const supabase = await createSupabaseServerClient();

  const [{ data: userRow }, { data: settingsRow }, { data: prefsRows }, authUser] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, email, full_name_ar, full_name_en, phone")
        .eq("id", tenant.user_id)
        .single(),
      supabase
        .from("user_settings")
        .select("prefs_jsonb")
        .eq("user_id", tenant.user_id)
        .maybeSingle(),
      supabase
        .from("user_notification_prefs")
        .select("event_type, channel, enabled")
        .eq("user_id", tenant.user_id),
      supabase.auth.getUser(),
    ]);

  const profile: ProfileRow = {
    full_name_ar: (userRow?.full_name_ar as string | null) ?? null,
    full_name_en: (userRow?.full_name_en as string | null) ?? null,
    email: (userRow?.email as string | null) ?? authUser.data.user?.email ?? null,
    phone: (userRow?.phone as string | null) ?? null,
  };

  const prefs = (settingsRow?.prefs_jsonb ?? {}) as Record<string, unknown>;
  const initialPrefs: InitialPrefs = {
    preferred_locale: typeof prefs.preferred_locale === "string"
      ? (prefs.preferred_locale as "ar" | "en")
      : (locale as "ar" | "en"),
    date_format: typeof prefs.date_format === "string"
      ? (prefs.date_format as "iso" | "long" | "short" | "hijri")
      : "long",
    high_contrast: prefs.high_contrast === true,
    reduced_motion: prefs.reduced_motion === true,
  };

  // Fold the stored rows into a complete grid, defaulting every (event,
  // channel) cell to enabled. That way new events surface immediately and
  // the user only has to flip off what they don't want.
  const storedPrefs = new Map<string, boolean>();
  for (const row of prefsRows ?? []) {
    storedPrefs.set(`${row.event_type}:${row.channel}`, Boolean(row.enabled));
  }
  const notificationPrefs: NotificationPrefRow[] = [];
  for (const event_type of NOTIFICATION_EVENTS) {
    for (const channel of CHANNELS) {
      const key = `${event_type}:${channel}`;
      notificationPrefs.push({
        event_type,
        channel,
        enabled: storedPrefs.has(key) ? Boolean(storedPrefs.get(key)) : true,
      });
    }
  }

  return (
    <SettingsClient
      profile={profile}
      initialPrefs={initialPrefs}
      notificationPrefs={notificationPrefs}
      events={[...NOTIFICATION_EVENTS]}
      channels={[...CHANNELS]}
    />
  );
}
