import { createServiceRoleClient, createSupabaseServerClient } from "@/lib/supabase-server";

export interface PublicMember {
  member_id: string;
  plan_discount_pct: number;
}

// Identifies the signed-in member of the given tenant from the public side.
// Returns null when:
//  - no Supabase session (anonymous visitor)
//  - the signed-in user is not a member of this org
//  - the member exists but has no active subscription with a discount
//
// Cheap: one auth call + one member-with-subscription join. Safe to call
// from any public RSC.
export async function detectPublicMember(
  org_id: string,
): Promise<PublicMember | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createServiceRoleClient();
  const { data: member } = await admin
    .from("members")
    .select(
      "id, status, subscriptions:subscriptions(status, plan:plans(member_only_store_discount_pct))",
    )
    .eq("org_id", org_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member || member.status !== "active") return null;

  const subs = (Array.isArray(member.subscriptions)
    ? member.subscriptions
    : [member.subscriptions]
  ).filter(Boolean) as Array<{
    status?: string;
    plan?: { member_only_store_discount_pct?: number | string } | null;
  }>;
  const activeSub = subs.find((s) => s && s.status === "active");
  const planDiscountPct = activeSub?.plan?.member_only_store_discount_pct
    ? Number(activeSub.plan.member_only_store_discount_pct)
    : 0;

  return { member_id: member.id as string, plan_discount_pct: planDiscountPct };
}
