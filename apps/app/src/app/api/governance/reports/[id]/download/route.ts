import { NextResponse } from "next/server";

import { computeQuarterlyScore } from "@sporlo/governance";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import { buildMinistryExcel } from "@/lib/ministry-report-xlsx";
import { buildMinistryPdf } from "@/lib/ministry-report-pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let tenant;
  try {
    tenant = await getActiveTenant();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: report } = await supabase
    .from("ministry_reports")
    .select("id, quarter, format, org_id")
    .eq("id", id)
    .eq("org_id", tenant.org_id)
    .maybeSingle();

  if (!report) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name_ar, name_en, tier, slug")
    .eq("id", tenant.org_id)
    .maybeSingle();

  const { data: criteria } = await supabase
    .from("kpi_categories")
    .select("code, category, title_ar, title_en, weight");

  const score = await computeQuarterlyScore({
    client: supabase,
    org_id: tenant.org_id,
    quarter: report.quarter,
  });

  const reportData = {
    org: org ?? { name_ar: "—", name_en: "—", tier: null, slug: tenant.org_id },
    quarter: report.quarter,
    total_score: score.total_score,
    categories: score.categories,
    criteria: criteria ?? [],
  };

  if (report.format === "xlsx") {
    const buf = await buildMinistryExcel(reportData);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="sporlo-kpi-${report.quarter}.xlsx"`,
      },
    });
  }

  const pdf = await buildMinistryPdf(reportData);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="sporlo-kpi-${report.quarter}.pdf"`,
    },
  });
}
