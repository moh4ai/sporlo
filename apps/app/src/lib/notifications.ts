import { createServiceRoleClient } from "@/lib/supabase-server";

// Notification spec — one record per recipient. Server Actions call
// emitNotification() after the business mutation succeeds; the helper
// resolves recipients (when given a role filter), checks user prefs to
// suppress disabled channels, and writes rows via service-role.
//
// The "in_app" prefs gate is enforced here. The "email" prefs gate happens
// at the email-sending site (Resend / SendGrid) — those flows read the
// same `user_notification_prefs` table.

export type NotificationSpec = {
  org_id: string;
  type: string;
  title_ar: string;
  title_en: string;
  body_ar?: string;
  body_en?: string;
  payload?: Record<string, unknown>;
  href?: string;
  /**
   * Either name explicit recipients OR a role filter (or both). When both
   * are present, the union of resolved user IDs is used.
   */
  recipient_user_ids?: string[];
  recipient_roles?: Array<
    "super_admin" | "club_admin" | "dept_manager" | "staff" | "coach" | "auditor"
  >;
};

export async function emitNotification(spec: NotificationSpec): Promise<{
  inserted: number;
}> {
  const admin = createServiceRoleClient();

  // Resolve recipients.
  const recipients = new Set<string>(spec.recipient_user_ids ?? []);
  if (spec.recipient_roles && spec.recipient_roles.length) {
    const { data } = await admin
      .from("users")
      .select("id")
      .eq("org_id", spec.org_id)
      .eq("active", true)
      .in("role", spec.recipient_roles);
    for (const u of data ?? []) recipients.add(u.id as string);
  }

  if (recipients.size === 0) return { inserted: 0 };

  // Suppress in_app channel for users who've disabled this event.
  const { data: prefs } = await admin
    .from("user_notification_prefs")
    .select("user_id, enabled")
    .in("user_id", Array.from(recipients))
    .eq("event_type", spec.type)
    .eq("channel", "in_app");
  const disabled = new Set(
    (prefs ?? []).filter((p) => p.enabled === false).map((p) => p.user_id as string),
  );

  const rows = Array.from(recipients)
    .filter((id) => !disabled.has(id))
    .map((id) => ({
      org_id: spec.org_id,
      recipient_user_id: id,
      type: spec.type,
      title_ar: spec.title_ar,
      title_en: spec.title_en,
      body_ar: spec.body_ar ?? null,
      body_en: spec.body_en ?? null,
      payload_jsonb: spec.payload ?? {},
      href: spec.href ?? null,
    }));

  if (rows.length === 0) return { inserted: 0 };

  const { error } = await admin.from("notifications").insert(rows);
  if (error) {
    // Don't throw — notification delivery is best-effort. The caller's
    // primary mutation already succeeded.
    console.error("emitNotification failed:", error.message);
    return { inserted: 0 };
  }
  return { inserted: rows.length };
}
