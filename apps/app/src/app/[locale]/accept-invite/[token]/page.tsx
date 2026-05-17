import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import {
  createServiceRoleClient,
  createSupabaseServerClient,
} from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

import { AcceptInviteClient } from "./_components/AcceptInviteClient";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale as Locale);

  // Look up the invitation row up-front so we can render a friendly
  // preview ("Join Demo Club as staff") regardless of sign-in state. We
  // re-check expiry / acceptance server-side when the user clicks accept.
  const admin = createServiceRoleClient();
  const { data: inv } = await admin
    .from("user_invitations")
    .select("id, org_id, email, role, expires_at, accepted_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  let invitationStatus:
    | "valid"
    | "invalid"
    | "expired"
    | "accepted" = "valid";
  if (!inv) invitationStatus = "invalid";
  else if (inv.revoked_at) invitationStatus = "invalid";
  else if (inv.accepted_at) invitationStatus = "accepted";
  else if (new Date(inv.expires_at).getTime() < Date.now())
    invitationStatus = "expired";

  // Resolve the org name (bilingual) for the preview card.
  let clubName: { ar: string; en: string } | null = null;
  if (inv) {
    const { data: org } = await admin
      .from("organizations")
      .select("name_ar, name_en")
      .eq("id", inv.org_id)
      .single();
    if (org) {
      clubName = { ar: org.name_ar as string, en: org.name_en as string };
    }
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If the invite is fine and the signed-in user already belongs to this
  // org, send them straight into the dashboard — they don't need to accept
  // again.
  if (user && inv && invitationStatus === "accepted") {
    redirect(`/${locale}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-spo-paper p-4">
      <AcceptInviteClient
        locale={locale as "ar" | "en"}
        token={token}
        status={invitationStatus}
        invitationEmail={inv?.email as string | null}
        invitationRole={inv?.role as string | null}
        clubName={clubName}
        currentEmail={user?.email ?? null}
      />
    </div>
  );
}
