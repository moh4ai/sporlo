import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Badge, Card } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

import { AttendanceClient, type MemberOption } from "./_components/AttendanceClient";
import {
  ProgressNotesClient,
  type ExistingNote,
} from "./_components/ProgressNotesClient";

export default async function AcademySessionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "academy" });

  const supabase = await createSupabaseServerClient();
  const { data: session } = await supabase
    .from("academy_sessions")
    .select(
      "id, title_ar, title_en, scheduled_at, duration_minutes, age_group, notes, cancelled_at, coach_id, coach:coaches(full_name_ar, full_name_en)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();

  const coach = Array.isArray(session.coach) ? session.coach[0] : session.coach;
  const coachName =
    coach != null
      ? locale === "ar"
        ? coach.full_name_ar
        : coach.full_name_en ?? coach.full_name_ar
      : null;

  const { data: members } = await supabase
    .from("members")
    .select("id, full_name_ar, full_name_en, member_number")
    .eq("status", "active")
    .order("full_name_en", { ascending: true });

  const memberOptions: MemberOption[] = (members ?? []).map((m) => ({
    id: m.id,
    full_name: locale === "ar" ? m.full_name_ar : m.full_name_en ?? m.full_name_ar,
    member_number: m.member_number,
  }));

  const { data: existingAttendance } = await supabase
    .from("session_attendance")
    .select("member_id, present, note")
    .eq("session_id", id);

  const { data: existingNotes } = await supabase
    .from("progress_notes")
    .select(
      "id, member_id, note_ar, note_en, rating, parent_visible, created_at, member:members(full_name_ar, full_name_en)",
    )
    .eq("session_id", id)
    .order("created_at", { ascending: false });

  const notes: ExistingNote[] = (existingNotes ?? []).map((n) => {
    const member = Array.isArray(n.member) ? n.member[0] : n.member;
    return {
      id: n.id,
      member_id: n.member_id,
      member_name:
        locale === "ar"
          ? member?.full_name_ar ?? "—"
          : member?.full_name_en ?? member?.full_name_ar ?? "—",
      note:
        locale === "ar"
          ? n.note_ar ?? n.note_en ?? ""
          : n.note_en ?? n.note_ar ?? "",
      rating: n.rating,
      parent_visible: n.parent_visible,
      created_at: n.created_at,
    };
  });

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const title = locale === "ar" ? session.title_ar : session.title_en;

  return (
    <div className="space-y-6">
      <Link href="/academy" className="text-sm text-spo-muted hover:text-spo-ink">
        ← {t("common.back")}
      </Link>

      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-spo-ink">{title}</h2>
          {session.cancelled_at && <Badge tone="neutral">cancelled</Badge>}
        </div>
        <p className="text-sm text-spo-muted">
          {dateFmt.format(new Date(session.scheduled_at))} · {session.duration_minutes}m
          {coachName ? ` · ${coachName}` : ""}
          {session.age_group ? ` · ${session.age_group}` : ""}
        </p>
        {session.notes && (
          <Card variant="warm" className="mt-2">
            <p className="text-sm text-spo-ink-2">{session.notes}</p>
          </Card>
        )}
      </header>

      <AttendanceClient
        sessionId={id}
        members={memberOptions}
        existing={(existingAttendance ?? []).map((a) => ({
          member_id: a.member_id,
          present: a.present,
          note: a.note,
        }))}
      />

      <ProgressNotesClient
        sessionId={id}
        members={memberOptions}
        initial={notes}
        coachId={session.coach_id}
        locale={locale as "ar" | "en"}
      />
    </div>
  );
}
