import { cookies } from "next/headers";

import { parseClaims } from "@sporlo/auth";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export class TenantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantError";
  }
}

export interface ActiveTenant {
  org_id: string;
  user_id: string;
  user_role: NonNullable<ReturnType<typeof parseClaims>["role"]>;
  department: ReturnType<typeof parseClaims>["department"];
  /** Slug from the request hostname or ?org= query, if any. */
  slug_from_request: string | null;
}

// Read the active tenant from the request: JWT first (the authoritative
// source), then the sporlo-tenant-slug cookie set by middleware (used for
// matching subdomain against JWT to enforce one-org-per-host).
export async function getActiveTenant(): Promise<ActiveTenant> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new TenantError("no-session");

  const claims = parseClaims(session.access_token);
  if (!claims.org_id || !claims.role) {
    throw new TenantError("no-org-claim");
  }

  const cookieStore = await cookies();
  const slugFromRequest =
    cookieStore.get("sporlo-tenant-slug")?.value ?? null;

  return {
    org_id: claims.org_id,
    user_id: claims.sub,
    user_role: claims.role,
    department: claims.department,
    slug_from_request: slugFromRequest,
  };
}

// Enforce that the hostname's slug matches the JWT's org. If slug_from_request
// is null (bare hostname or dev with no override), this is a no-op. When it's
// present, we look up the org and confirm IDs match. Throws on mismatch.
export async function enforceHostMatchesOrg(tenant: ActiveTenant): Promise<void> {
  if (!tenant.slug_from_request) return;
  if (tenant.user_role === "super_admin") return; // Sporlo HQ can cross tenants

  const supabase = await createSupabaseServerClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", tenant.slug_from_request)
    .maybeSingle();

  if (!org || org.id !== tenant.org_id) {
    throw new TenantError("host-org-mismatch");
  }
}
