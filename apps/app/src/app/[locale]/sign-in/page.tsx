import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { SignInForm } from "@/components/SignInForm";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale as Locale);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Already signed in? If we know which plan they came for, drop them at
  // checkout instead of the dashboard so the fan-portal journey continues.
  if (user) {
    if (sp.plan) {
      redirect(`/${locale}/membership/checkout?plan=${encodeURIComponent(sp.plan)}`);
    }
    redirect(`/${locale}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-spo-paper p-4">
      <SignInForm locale={locale as "ar" | "en"} />
    </div>
  );
}
