import ExcelJS from "exceljs";

import type { CategoryScore } from "@sporlo/governance";

interface ReportInput {
  org: { name_ar: string; name_en: string; tier: string | null; slug: string };
  quarter: string;
  total_score: number;
  categories: CategoryScore[];
  criteria: Array<{
    code: string;
    category: string;
    title_ar: string;
    title_en: string;
    weight: number;
  }>;
}

const CATEGORY_LABEL: Record<string, string> = {
  b: "B — Governance & Finance",
  c: "C — Sports & Academy",
  d: "D — Community",
  e: "E — Infrastructure",
};

export async function buildMinistryExcel(input: ReportInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sporlo";
  wb.created = new Date();

  // ── Sheet 1: Summary
  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Field", key: "field", width: 28 },
    { header: "Value", key: "value", width: 40 },
  ];
  summary.addRows([
    { field: "Organisation (AR)", value: input.org.name_ar },
    { field: "Organisation (EN)", value: input.org.name_en },
    { field: "Tier", value: input.org.tier?.toUpperCase() ?? "—" },
    { field: "Quarter", value: input.quarter },
    { field: "Total weighted score", value: input.total_score.toFixed(2) },
    { field: "Generated at", value: new Date().toISOString() },
  ]);
  summary.getRow(1).font = { bold: true };

  // ── Sheet 2: Criteria breakdown
  const sheet = wb.addWorksheet("Criteria");
  sheet.columns = [
    { header: "Code", key: "code", width: 8 },
    { header: "Category", key: "category", width: 28 },
    { header: "Title (AR)", key: "title_ar", width: 32 },
    { header: "Title (EN)", key: "title_en", width: 32 },
    { header: "Weight", key: "weight", width: 8 },
    { header: "Events", key: "events", width: 8 },
    { header: "Weighted score", key: "weighted", width: 14 },
  ];

  // Build a lookup of computed values keyed by code.
  const byCode = new Map<string, { event_count: number; weighted: number }>();
  for (const cat of input.categories) {
    for (const c of cat.criteria) {
      byCode.set(c.code, {
        event_count: c.event_count,
        weighted: c.weighted_score,
      });
    }
  }

  for (const c of input.criteria) {
    const v = byCode.get(c.code) ?? { event_count: 0, weighted: 0 };
    sheet.addRow({
      code: c.code,
      category: CATEGORY_LABEL[c.category] ?? c.category,
      title_ar: c.title_ar,
      title_en: c.title_en,
      weight: c.weight,
      events: v.event_count,
      weighted: Number(v.weighted.toFixed(2)),
    });
  }
  sheet.getRow(1).font = { bold: true };
  sheet.getColumn("events").alignment = { horizontal: "right" };
  sheet.getColumn("weighted").alignment = { horizontal: "right" };

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
