import PDFDocument from "pdfkit";

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

export async function buildMinistryPdf(input: ReportInput): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc
      .fontSize(20)
      .fillColor("#0a3d2c")
      .text("Sporlo · Ministry KPI Report", { align: "left" });
    doc.moveDown(0.3);
    doc
      .fontSize(11)
      .fillColor("#555")
      .text(`${input.org.name_en} (${input.org.name_ar})`)
      .text(`Tier: ${input.org.tier?.toUpperCase() ?? "—"}    Quarter: ${input.quarter}`)
      .text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown(0.5);

    // Total score banner
    doc.rect(48, doc.y, doc.page.width - 96, 56).fill("#e8f5ee");
    const bannerY = doc.y - 56;
    doc
      .fillColor("#0a3d2c")
      .fontSize(10)
      .text("TOTAL WEIGHTED SCORE", 60, bannerY + 10);
    doc
      .fontSize(24)
      .fillColor("#000")
      .text(input.total_score.toFixed(2), 60, bannerY + 24);
    doc.moveDown(2);

    // Build lookup
    const byCode = new Map<string, { event_count: number; weighted: number }>();
    for (const cat of input.categories) {
      for (const c of cat.criteria) {
        byCode.set(c.code, {
          event_count: c.event_count,
          weighted: c.weighted_score,
        });
      }
    }

    // Group criteria by category for printing
    const grouped = new Map<string, typeof input.criteria>();
    for (const c of input.criteria) {
      const list = grouped.get(c.category) ?? [];
      list.push(c);
      grouped.set(c.category, list);
    }

    const order = ["b", "c", "d", "e"];
    for (const cat of order) {
      const list = grouped.get(cat);
      if (!list || list.length === 0) continue;

      doc.moveDown(0.5);
      doc
        .fontSize(13)
        .fillColor("#0a3d2c")
        .text(CATEGORY_LABEL[cat] ?? cat.toUpperCase(), { underline: false });
      doc.moveDown(0.2);

      // Table header
      const tableTop = doc.y;
      const colX = [60, 110, 360, 410, 470];
      doc.fontSize(10).fillColor("#444");
      doc.text("Code", colX[0], tableTop);
      doc.text("Criterion", colX[1], tableTop);
      doc.text("Weight", colX[2], tableTop);
      doc.text("Events", colX[3], tableTop);
      doc.text("Score", colX[4], tableTop);
      doc.moveTo(48, tableTop + 14).lineTo(doc.page.width - 48, tableTop + 14).stroke();

      let y = tableTop + 20;
      list.sort((a, b) => a.code.localeCompare(b.code));
      for (const c of list) {
        if (y > doc.page.height - 80) {
          doc.addPage();
          y = 60;
        }
        const v = byCode.get(c.code) ?? { event_count: 0, weighted: 0 };
        doc.fillColor("#000").fontSize(10);
        doc.text(c.code, colX[0], y);
        doc.text(c.title_en, colX[1], y, { width: 240 });
        doc.text(String(c.weight), colX[2], y);
        doc.text(String(v.event_count), colX[3], y);
        doc.text(v.weighted.toFixed(2), colX[4], y);
        y += 18;
      }

      doc.y = y + 6;
    }

    doc.end();
  });
}
