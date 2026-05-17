"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { canPerform, type Principal } from "@sporlo/auth";
import {
  Badge,
  Button,
  EmptyTableRow,
  FormGroup,
  Input,
  Modal,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import { generateMinistryReport, markReportSubmitted } from "../../actions";

export type ReportRow = {
  id: string;
  quarter: string;
  format: "pdf" | "xlsx";
  total_score: number | null;
  generated_at: string;
  submitted_at: string | null;
};

export function ReportsClient({
  reports,
  defaultQuarter,
  principal,
  locale,
}: {
  reports: ReportRow[];
  defaultQuarter: string;
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("governance");
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const canCreate = useMemo(() => canPerform(principal, "create", "ministry_report"), [principal]);
  const canSubmit = useMemo(() => canPerform(principal, "update", "governance"), [principal]);

  const [open, setOpen] = useState(false);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [locale],
  );

  async function submitMark(r: ReportRow) {
    const res = await markReportSubmitted({ id: r.id });
    if (res.ok) {
      toast.push({ tone: "success", title: t("reports.submitted") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("reports.title")}</h2>
          <p className="text-sm text-spo-muted">{t("reports.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setOpen(true)}>{t("reports.generate")}</Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("reports.headers.quarter")}</TH>
            <TH>{t("reports.headers.format")}</TH>
            <TH>{t("reports.headers.totalScore")}</TH>
            <TH>{t("reports.headers.generatedAt")}</TH>
            <TH>{t("reports.headers.submittedAt")}</TH>
            <TH>{t("reports.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {reports.length === 0 ? (
            <EmptyTableRow colSpan={6}>{t("reports.empty")}</EmptyTableRow>
          ) : (
            reports.map((r) => (
              <TR key={r.id}>
                <TD className="font-medium">{r.quarter}</TD>
                <TD>
                  <Badge tone="neutral">{r.format.toUpperCase()}</Badge>
                </TD>
                <TD>{r.total_score?.toFixed(2) ?? "—"}</TD>
                <TD className="text-xs text-spo-muted">
                  {dateFmt.format(new Date(r.generated_at))}
                </TD>
                <TD className="text-xs text-spo-muted">
                  {r.submitted_at ? dateFmt.format(new Date(r.submitted_at)) : "—"}
                </TD>
                <TD className="space-x-2 rtl:space-x-reverse">
                  <a
                    href={`/api/governance/reports/${r.id}/download`}
                    className="text-sm text-spo-green-deep hover:underline"
                  >
                    {r.format.toUpperCase()}
                  </a>
                  {canSubmit && !r.submitted_at && (
                    <button
                      type="button"
                      onClick={() => submitMark(r)}
                      className="text-sm text-spo-muted hover:text-spo-ink-2"
                    >
                      {t("reports.actions.markSubmitted")}
                    </button>
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {open && (
        <GenerateModal
          defaultQuarter={defaultQuarter}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}

function GenerateModal({
  defaultQuarter,
  onClose,
  onDone,
}: {
  defaultQuarter: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("governance");
  const toast = useToast();
  const [quarter, setQuarter] = useState(defaultQuarter);
  const [format, setFormat] = useState<"pdf" | "xlsx">("pdf");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await generateMinistryReport({ quarter, format });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("reports.generated") });
      onDone();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("reports.form.createTitle")}>
      <form onSubmit={submit} className="space-y-4">
        <FormGroup label={t("reports.form.quarter")} required>
          <Input
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            placeholder="2026-Q2"
            pattern="\d{4}-Q[1-4]"
            required
            dir="ltr"
          />
        </FormGroup>
        <FormGroup label={t("reports.form.format")} required>
          <Select
            value={format}
            onChange={(e) => setFormat(e.target.value as "pdf" | "xlsx")}
            required
          >
            <option value="pdf">PDF</option>
            <option value="xlsx">Excel</option>
          </Select>
        </FormGroup>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>{t("reports.generate")}</Button>
        </div>
      </form>
    </Modal>
  );
}
