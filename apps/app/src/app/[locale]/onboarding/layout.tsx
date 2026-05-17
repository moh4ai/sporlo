import Image from "next/image";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

export default async function OnboardingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/sign-in`);

  // If the user already has a public.users row (and therefore an org), skip
  // onboarding and send them to the dashboard.
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) redirect(`/${locale}`);

  return (
    <div className="min-h-screen bg-spo-paper">
      <header className="border-b border-spo-line bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Image
            src="/brand/sporlo-logo-green.png"
            alt="Sporlo"
            width={28}
            height={28}
            priority
          />
          <span
            className="text-xl text-spo-green-deep"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Sporlo
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-6">{children}</main>
    </div>
  );
}
