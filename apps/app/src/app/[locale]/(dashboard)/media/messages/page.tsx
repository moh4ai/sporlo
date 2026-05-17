import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  MessagesClient,
  type MemberOption,
  type MessageRow,
  type ThreadRow,
} from "./_components/MessagesClient";

type ThreadDb = {
  id: string;
  subject: string;
  status: "open" | "resolved" | "archived";
  last_message_at: string;
  member_id: string | null;
  member: { full_name_ar: string; full_name_en: string | null } | { full_name_ar: string; full_name_en: string | null }[] | null;
};

export default async function MessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { t: selectedId } = await searchParams;
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();

  const [{ data: threadData }, { data: memberData }] = await Promise.all([
    supabase
      .from("message_threads")
      .select(
        "id, subject, status, last_message_at, member_id, member:members(full_name_ar, full_name_en)",
      )
      .order("last_message_at", { ascending: false })
      .limit(50),
    supabase
      .from("members")
      .select("id, full_name_ar, full_name_en")
      .eq("status", "active")
      .order("full_name_ar"),
  ]);

  const threads: ThreadRow[] = ((threadData ?? []) as ThreadDb[]).map((th) => {
    const member = Array.isArray(th.member) ? th.member[0] : th.member;
    return {
      id: th.id,
      subject: th.subject,
      status: th.status,
      last_message_at: th.last_message_at,
      member_name: member
        ? locale === "ar"
          ? member.full_name_ar
          : member.full_name_en ?? member.full_name_ar
        : null,
    };
  });

  const memberOptions: MemberOption[] = (memberData ?? []).map((m) => ({
    id: m.id,
    label: locale === "ar" ? m.full_name_ar : m.full_name_en ?? m.full_name_ar,
  }));

  const selected =
    selectedId && threads.find((t) => t.id === selectedId)
      ? threads.find((t) => t.id === selectedId) ?? null
      : threads[0] ?? null;

  let messages: MessageRow[] = [];
  if (selected) {
    const { data } = await supabase
      .from("messages")
      .select("id, sender_role, body, created_at")
      .eq("thread_id", selected.id)
      .order("created_at", { ascending: true });
    messages = (data ?? []) as MessageRow[];
  }

  return (
    <MessagesClient
      threads={threads}
      selected={selected}
      messages={messages}
      memberOptions={memberOptions}
      principal={{ role: tenant.user_role, department: tenant.department }}
      locale={locale as "ar" | "en"}
    />
  );
}
