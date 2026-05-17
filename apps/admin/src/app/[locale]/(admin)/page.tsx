import { redirect } from "next/navigation";

import type { Locale } from "@/i18n/routing";

export default async function AdminRoot({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale as Locale}/clubs`);
}
