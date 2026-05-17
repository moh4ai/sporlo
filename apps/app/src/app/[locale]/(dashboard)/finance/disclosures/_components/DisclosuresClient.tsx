"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { canPerform, type Principal } from "@sporlo/auth";
import {
  Button,
  EmptyTableRow,
  FileUpload,
  FormGroup,
  Input,
  Modal,
  Table,
  TBody,
  TD,
  TH,
  THead,
  Textarea,
  TR,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import {
  createDisclosureUploadUrl,
  submitQuarterlyDisclosure,
} from "../../actions";

export type DisclosureRow = {
  id: string;
  quarter: string;
  submitted_at: string | null;
  storage_path: string | null;
};

export function DisclosuresClient({
  disclosures,
  principal,
  locale,
}: {
  disclosures: DisclosureRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("finance");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const canCreate = useMemo(
    () => canPerform(principal, "create", "governance_document"),
    [principal],
  );

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [locale],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">
            {t("disclosures.title")}
          </h2>
          <p className="text-sm text-spo-muted">{t("disclosures.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setFormOpen(true)}>
            {t("disclosures.newDisclosure")}
          </Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("disclosures.headers.quarter")}</TH>
            <TH>{t("disclosures.headers.submittedAt")}</TH>
            <TH>{t("disclosures.headers.document")}</TH>
            <TH>{t("disclosures.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {disclosures.length === 0 ? (
            <EmptyTableRow colSpan={4}>{t("disclosures.empty")}</EmptyTableRow>
          ) : (
            disclosures.map((d) => (
              <TR key={d.id}>
                <TD className="font-medium">
                  <code className="rounded bg-spo-paper px-1.5 py-0.5 text-xs">
                    {d.quarter}
                  </code>
                </TD>
                <TD className="text-xs text-spo-muted">
                  {d.submitted_at
                    ? dateFmt.format(new Date(d.submitted_at))
                    : "—"}
                </TD>
                <TD className="text-xs text-spo-muted">
                  {d.storage_path
                    ? d.storage_path.split("/").pop()
                    : "—"}
                </TD>
                <TD />
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {formOpen && (
        <DisclosureFormModal
          onClose={() => setFormOpen(false)}
          onDone={() => {
            setFormOpen(false);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}

function DisclosureFormModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("finance");
  const toast = useToast();
  const [quarter, setQuarter] = useState(suggestedQuarter());
  const [totals, setTotals] = useState("");
  const [notes, setNotes] = useState("");
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(file: File) {
    setUploading(true);
    setErr(null);
    const signed = await createDisclosureUploadUrl({ filename: file.name });
    if (!signed.ok) {
      setUploading(false);
      setErr(t("disclosures.errors.uploadFailed"));
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: signed.error });
      return;
    }
    const upload = await fetch(signed.data.signed_url, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    setUploading(false);
    if (!upload.ok) {
      setErr(t("disclosures.errors.uploadFailed"));
      toast.push({ tone: "error", title: t("toast.saveFailed") });
      return;
    }
    setUploadedPath(signed.data.path);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const res = await submitQuarterlyDisclosure({
      quarter,
      storage_path: uploadedPath ?? "",
      totals,
      notes,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.disclosureSubmitted") });
      onDone();
    } else {
      if (res.field === "quarter") setErr(t("disclosures.errors.invalidQuarter"));
      else setErr(res.error);
      toast.push({ tone: "error", title: t("toast.saveFailed") });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("disclosures.form.title")}>
      <form onSubmit={submit} className="space-y-4">
        <FormGroup
          label={t("disclosures.form.quarter")}
          hint={t("disclosures.form.quarterHint")}
          required
        >
          <Input
            value={quarter}
            onChange={(e) => setQuarter(e.target.value.toUpperCase())}
            dir="ltr"
            placeholder="2026-Q2"
            required
          />
        </FormGroup>

        <FormGroup label={t("disclosures.form.file")}>
          <FileUpload
            label={uploadedPath ?? t("disclosures.form.file")}
            hint={uploading ? "…" : ""}
            accept=".pdf,.xlsx,.xls,.csv"
            disabled={uploading || submitting}
            onFile={onFile}
          />
        </FormGroup>

        <FormGroup
          label={t("disclosures.form.totals")}
          hint={t("disclosures.form.totalsHint")}
        >
          <Textarea
            rows={3}
            value={totals}
            onChange={(e) => setTotals(e.target.value)}
            dir="ltr"
            placeholder='{"revenue":0,"expenses":0}'
          />
        </FormGroup>

        <FormGroup label={t("disclosures.form.notes")}>
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormGroup>

        {err && <p className="text-sm text-spo-danger">{err}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting || uploading}>
            {t("disclosures.newDisclosure")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function suggestedQuarter(): string {
  const d = new Date();
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()}-Q${q}`;
}
