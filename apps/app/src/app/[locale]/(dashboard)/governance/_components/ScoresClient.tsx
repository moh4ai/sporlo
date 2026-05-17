"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import {
  Badge,
  Button,
  Card,
  EmptyTableRow,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@sporlo/ui";
import type { KpiCategory } from "@sporlo/db";

import { useRouter } from "@/i18n/navigation";

import { recomputeQuarterlyScore } from "../actions";

export interface CriterionLine {
  code: string;
  category: KpiCategory;
  weight: number;
  event_count: number;
  weighted_score: number;
}

export interface CategoryBlock {
  category: KpiCategory;
  total: number;
  criteria: CriterionLine[];
}

export interface ScoresProps {
  quarter: string;
  quarters: string[];
  total_score: number;
  categories: CategoryBlock[];
  tier: string | null;
  support_amount_sar: number;
  penalty_amount_sar: number;
  canRecompute: boolean;
  locale: "ar" | "en";
}

export function ScoresClient({
  quarter,
  quarters,
  total_score,
  categories,
  tier,
  support_amount_sar,
  penalty_amount_sar,
  canRecompute,
  locale,
}: ScoresProps) {
  const t = useTranslations("governance");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const sarFmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB");

  function changeQuarter(q: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("q", q);
    window.location.href = url.toString();
  }

  async function recompute() {
    setBusy(true);
    const res = await recomputeQuarterlyScore({ quarter });
    setBusy(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("scores.recomputed") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("scores.recomputeFailed"), description: res.error });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("scores.title")}</h2>
          <p className="text-sm text-spo-muted">{t("scores.subtitle")}</p>
        </div>
        <div className="flex items-end gap-3">
          <label className="text-sm">
            <span className="block text-spo-muted">{t("common.quarter")}</span>
            <Select value={quarter} onChange={(e) => changeQuarter(e.target.value)}>
              {quarters.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </Select>
          </label>
          {canRecompute && (
            <Button onClick={recompute} disabled={busy}>
              {t("common.recompute")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("scores.totalScore")}
          value={total_score.toFixed(2)}
        />
        <StatCard
          label={t("scores.supportEstimate")}
          value={`${sarFmt.format(support_amount_sar)} SAR`}
          hint={tier ? `${t("scores.tier")} ${tier.toUpperCase()}` : undefined}
        />
        <StatCard
          label={t("scores.penaltyEstimate")}
          value={`${sarFmt.format(penalty_amount_sar)} SAR`}
          intent={penalty_amount_sar > 0 ? "danger" : undefined}
        />
      </div>

      {categories.length === 0 ? (
        <Card>
          <p className="text-sm text-spo-muted">{t("scores.empty")}</p>
        </Card>
      ) : (
        categories.map((block) => (
          <Card key={block.category}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-spo-ink">
                {t(`scores.categories.${block.category}`)}
              </h3>
              <span className="text-sm text-spo-muted">
                {block.total.toFixed(2)}
              </span>
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>{t("scores.headers.criterion")}</TH>
                  <TH>{t("scores.headers.weight")}</TH>
                  <TH>{t("scores.headers.events")}</TH>
                  <TH>{t("scores.headers.weightedScore")}</TH>
                </TR>
              </THead>
              <TBody>
                {block.criteria.length === 0 ? (
                  <EmptyTableRow colSpan={4}>—</EmptyTableRow>
                ) : (
                  block.criteria.map((c) => (
                    <TR key={c.code}>
                      <TD className="font-medium">{c.code}</TD>
                      <TD>{c.weight.toFixed(2)}</TD>
                      <TD>
                        {c.event_count === 0 ? (
                          <Badge tone="amber">0</Badge>
                        ) : (
                          c.event_count
                        )}
                      </TD>
                      <TD>{c.weighted_score.toFixed(2)}</TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </Card>
        ))
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  intent,
}: {
  label: string;
  value: string;
  hint?: string;
  intent?: "danger";
}) {
  return (
    <Card>
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-spo-muted">{label}</div>
        <div
          className={
            "text-2xl font-semibold " +
            (intent === "danger" ? "text-spo-danger" : "text-spo-ink")
          }
        >
          {value}
        </div>
        {hint && <div className="text-xs text-spo-muted">{hint}</div>}
      </div>
    </Card>
  );
}
