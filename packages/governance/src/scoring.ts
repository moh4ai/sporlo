// Pure scoring functions. Phase-1 placeholder = count of events per criterion
// weighted by the criterion's `weight`. Phase-3 swaps in the real Ministry
// formula (tier-progression rules, completeness percentages, deadline misses).

import type { KpiCategory } from "@sporlo/db";

interface EventRow {
  category: string | null;
  criterion_code: string | null;
  quantitative_value: number | null;
}

interface CriterionRow {
  code: string;
  category: KpiCategory;
  weight: number;
}

export interface CategoryScore {
  category: KpiCategory;
  criteria: CriterionScore[];
  total: number;
}

export interface CriterionScore {
  code: string;
  weight: number;
  event_count: number;
  weighted_score: number;
}

export function computeScores(
  org_id: string,
  quarter: string,
  events: EventRow[],
  criteria: CriterionRow[],
) {
  const byCriterion = new Map<string, number>();
  for (const e of events) {
    if (!e.criterion_code) continue;
    byCriterion.set(e.criterion_code, (byCriterion.get(e.criterion_code) ?? 0) + 1);
  }

  const byCategory = new Map<KpiCategory, CriterionScore[]>();
  for (const c of criteria) {
    const count = byCriterion.get(c.code) ?? 0;
    const score: CriterionScore = {
      code: c.code,
      weight: c.weight,
      event_count: count,
      weighted_score: count * c.weight,
    };
    const existing = byCategory.get(c.category) ?? [];
    existing.push(score);
    byCategory.set(c.category, existing);
  }

  const categories: CategoryScore[] = [];
  for (const [category, list] of byCategory.entries()) {
    const total = list.reduce((acc, s) => acc + s.weighted_score, 0);
    categories.push({ category, criteria: list, total });
  }

  const total_score = categories.reduce((acc, c) => acc + c.total, 0);
  return { org_id, quarter, categories, total_score };
}
