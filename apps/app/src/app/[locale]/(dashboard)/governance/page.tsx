import { setRequestLocale } from "next-intl/server";

import { canPerform } from "@sporlo/auth";
import {
  computeQuarterlyScore,
  currentQuarter,
  estimateFinancialSupport,
  estimatePenalty,
  previousQuarters,
} from "@sporlo/governance";
import type { KpiCategory } from "@sporlo/db";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveTenant } from "@/lib/tenant";
import type { Locale } from "@/i18n/routing";

import {
  ScoresClient,
  type CategoryBlock,
  type CriterionLine,
} from "./_components/ScoresClient";

const QUARTER_RE = /^\d{4}-Q[1-4]$/;

export default async function GovernanceScoresPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { q } = await searchParams;
  const tenant = await getActiveTenant();

  const quarter = q && QUARTER_RE.test(q) ? q : currentQuarter();
  const quarters = previousQuarters(8, quarter);
  // Make sure current quarter is in the dropdown when viewing history.
  if (!quarters.includes(currentQuarter())) quarters.unshift(currentQuarter());

  const supabase = await createSupabaseServerClient();
  const principal = { role: tenant.user_role, department: tenant.department };

  const [score, support, penalty, criteriaRows] = await Promise.all([
    computeQuarterlyScore({ client: supabase, org_id: tenant.org_id, quarter }),
    estimateFinancialSupport({
      client: supabase,
      org_id: tenant.org_id,
      quarter,
    }),
    estimatePenalty({ client: supabase, org_id: tenant.org_id, quarter }),
    supabase.from("kpi_categories").select("code, category, weight"),
  ]);

  // Group all criteria by category so empty categories still render.
  const byCategory = new Map<KpiCategory, CriterionLine[]>();
  for (const row of criteriaRows.data ?? []) {
    const cat = row.category as KpiCategory;
    const existing = byCategory.get(cat) ?? [];
    const match = score.categories
      .find((c) => c.category === cat)
      ?.criteria.find((c) => c.code === row.code);
    existing.push({
      code: row.code,
      category: cat,
      weight: Number(row.weight),
      event_count: match?.event_count ?? 0,
      weighted_score: match?.weighted_score ?? 0,
    });
    byCategory.set(cat, existing);
  }

  const categories: CategoryBlock[] = [];
  for (const cat of ["b", "c", "d", "e"] as KpiCategory[]) {
    const list = byCategory.get(cat) ?? [];
    if (list.length === 0) continue;
    list.sort((a, b) => a.code.localeCompare(b.code));
    const total = list.reduce((acc, c) => acc + c.weighted_score, 0);
    categories.push({ category: cat, total, criteria: list });
  }

  return (
    <ScoresClient
      quarter={quarter}
      quarters={quarters}
      total_score={score.total_score}
      categories={categories}
      tier={support.tier}
      support_amount_sar={support.amount_sar}
      penalty_amount_sar={penalty.amount_sar}
      canRecompute={canPerform(principal, "update", "governance")}
      locale={locale as "ar" | "en"}
    />
  );
}
