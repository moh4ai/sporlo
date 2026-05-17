import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { parseClaims } from "@sporlo/auth";

import { SignInForm } from "@/components/SignInForm";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If the user is already signed in and is a super_admin, send them to the
  // clubs list. Otherwise, render the form so they can switch accounts (or see
  // the not-authorized hint after submit).
  if (user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const claims = session ? parseClaims(session.access_token) : null;
    if (claims?.role === "super_admin") redirect(`/${locale}/clubs`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-spo-paper p-4">
      <SignInForm />
    </div>
  );
}
