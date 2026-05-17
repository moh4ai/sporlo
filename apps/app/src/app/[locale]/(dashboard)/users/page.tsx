import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { canPerform } from "@sporlo/auth";

import {
  createServiceRoleClient,
  createSupabaseServerClient,
} from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  UsersClient,
  type InvitationRow,
  type UserRow,
} from "./_components/UsersClient";

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tenant = await getActiveTenant();
  const principal = { role: tenant.user_role, department: tenant.department };
  if (!canPerform(principal, "read", "users")) {
    redirect(`/${locale}`);
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: usersData }, { data: invitesData }] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, full_name_ar, full_name_en, role, department, active, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("user_invitations")
      .select(
        "id, email, role, department, token, expires_at, accepted_at, revoked_at, created_at",
      )
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  // Pull last_sign_in_at from auth.users via the service-role admin API.
  // listUsers returns the entire project; we filter to our org's user IDs.
  // For Phase 1.2 scale (≤50 users/org) the single call is fine — revisit
  // when projects get large.
  const userIds = (usersData ?? []).map((u) => u.id as string);
  const lastSeen = new Map<string, string | null>();
  if (userIds.length > 0) {
    try {
      const admin = createServiceRoleClient();
      const { data: authData } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      for (const u of authData?.users ?? []) {
        if (userIds.includes(u.id)) {
          lastSeen.set(u.id, u.last_sign_in_at ?? null);
        }
      }
    } catch {
      // Admin API hiccup — fall through with empty map.
    }
  }

  const users: UserRow[] = (usersData ?? []).map((u) => ({
    id: u.id as string,
    email: (u.email as string | null) ?? null,
    full_name_ar: (u.full_name_ar as string | null) ?? null,
    full_name_en: (u.full_name_en as string | null) ?? null,
    role: u.role as UserRow["role"],
    department: (u.department as UserRow["department"]) ?? null,
    active: Boolean(u.active),
    last_sign_in_at: lastSeen.get(u.id as string) ?? null,
  }));

  const invitations: InvitationRow[] = (invitesData ?? []).map((i) => ({
    id: i.id as string,
    email: i.email as string,
    role: i.role as InvitationRow["role"],
    department: (i.department as InvitationRow["department"]) ?? null,
    token: i.token as string,
    expires_at: i.expires_at as string,
  }));

  const canManageUsers = canPerform(principal, "update", "user");
  const canArchiveUsers = canPerform(principal, "delete", "user");
  const canInvite = canPerform(principal, "create", "invitation");

  return (
    <UsersClient
      users={users}
      invitations={invitations}
      currentUserId={tenant.user_id}
      canManageUsers={canManageUsers}
      canArchiveUsers={canArchiveUsers}
      canInvite={canInvite}
      locale={locale as "ar" | "en"}
    />
  );
}
