import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

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
  if (user) redirect(`/${locale}`);

  return (
    <div className="flex min-h-screen items-center justify-center bg-spo-paper p-4">
      <SignInForm locale={locale as "ar" | "en"} />
    </div>
  );
}
