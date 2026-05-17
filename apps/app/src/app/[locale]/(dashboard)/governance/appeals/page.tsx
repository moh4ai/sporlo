import { setRequestLocale } from "next-intl/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  AppealsClient,
  type AppealRow,
  type PenaltyOption,
} from "./_components/AppealsClient";

type AppealDb = {
  id: string;
  filed_at: string;
  narrative: string;
  status: "open" | "approved" | "rejected" | "withdrawn";
  resolution_notes: string | null;
  penalty_log_id: string | null;
  penalty: { quarter: string; criterion_code: string | null; reason: string } | { quarter: string; criterion_code: string | null; reason: string }[] | null;
};

export default async function AppealsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const tenant = await getActiveTenant();

  const supabase = await createSupabaseServerClient();

  const [{ data: appealsData }, { data: penaltiesData }] = await Promise.all([
    supabase
      .from("appeal_log")
      .select(
        "id, filed_at, narrative, status, resolution_notes, penalty_log_id, penalty:penalty_log(quarter, criterion_code, reason)",
      )
      .order("filed_at", { ascending: false }),
    supabase
      .from("penalty_log")
      .select("id, quarter, criterion_code, reason, status")
      .neq("status", "waived")
      .order("created_at", { ascending: false }),
  ]);

  const appeals: AppealRow[] = ((appealsData ?? []) as AppealDb[]).map((a) => {
    const pen = Array.isArray(a.penalty) ? a.penalty[0] : a.penalty;
    return {
      id: a.id,
      filed_at: a.filed_at,
      narrative: a.narrative,
      status: a.status,
      resolution_notes: a.resolution_notes,
      penalty_log_id: a.penalty_log_id,
      penalty_label: pen
        ? `${pen.quarter} · ${pen.criterion_code ?? "—"} · ${pen.reason}`
        : null,
    };
  });

  const penaltyOptions: PenaltyOption[] = (penaltiesData ?? []).map((p) => ({
    id: p.id,
    label: `${p.quarter} · ${p.criterion_code ?? "—"} · ${p.reason}`,
  }));

  return (
    <AppealsClient
      appeals={appeals}
      penaltyOptions={penaltyOptions}
      principal={{ role: tenant.user_role, department: tenant.department }}
      locale={locale as "ar" | "en"}
    />
  );
}
