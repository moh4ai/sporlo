"use server";

import {
  actionError,
  actionOkVoid,
  BilingualNameSchema,
  SlugSchema,
  z,
  type ActionResult,
} from "@sporlo/shared";

import {
  createServiceRoleClient,
  createSupabaseServerClient,
} from "@/lib/supabase-server";

const OnboardingSchema = BilingualNameSchema.extend({
  slug: SlugSchema,
  primary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable(),
  departments: z.array(z.string()),
});

export type OnboardingPayload = z.infer<typeof OnboardingSchema>;

export async function completeOnboarding(
  payload: OnboardingPayload,
): Promise<ActionResult<void>> {
  const parsed = OnboardingSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return actionError(first?.message ?? "invalid-payload", first?.path?.[0]?.toString());
  }
  const { slug, name_ar, name_en, primary_color } = parsed.data;

  const ssr = await createSupabaseServerClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) return actionError("no-session");

  const admin = createServiceRoleClient();

  const { data: clash } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (clash) return actionError("slug-taken", "slug");

  const branding =
    primary_color && primary_color !== "" ? { primary_color } : {};

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({
      slug,
      name_ar,
      name_en,
      subdomain: slug,
      branding_overrides_jsonb: branding,
    })
    .select("id")
    .single();
  if (orgErr || !org) return actionError("org-insert-failed");

  const { error: branchErr } = await admin.from("branches").insert({
    org_id: org.id,
    name_ar,
    name_en,
  });
  if (branchErr) return actionError("branch-insert-failed");

  const { error: userErr } = await admin.from("users").insert({
    id: user.id,
    org_id: org.id,
    email: user.email ?? null,
    role: "club_admin",
  });
  if (userErr) return actionError("user-insert-failed");

  return actionOkVoid();
}
