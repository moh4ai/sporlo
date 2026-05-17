"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { canPerform, type Principal } from "@sporlo/auth";
import {
  Badge,
  Button,
  EmptyTableRow,
  FormGroup,
  Modal,
  Select,
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

import { fileAppeal, resolveAppeal } from "../../actions";

export type PenaltyOption = {
  id: string;
  label: string;
};

export type AppealRow = {
  id: string;
  filed_at: string;
  narrative: string;
  status: "open" | "approved" | "rejected" | "withdrawn";
  resolution_notes: string | null;
  penalty_log_id: string | null;
  penalty_label: string | null;
};

const STATUS_TONES: Record<AppealRow["status"], "amber" | "green" | "danger" | "neutral"> = {
  open: "amber",
  approved: "green",
  rejected: "danger",
  withdrawn: "neutral",
};

export function AppealsClient({
  appeals,
  penaltyOptions,
  principal,
  locale,
}: {
  appeals: AppealRow[];
  penaltyOptions: PenaltyOption[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("governance");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canCreate = useMemo(() => canPerform(principal, "create", "appeal"), [principal]);
  const canResolve = useMemo(() => canPerform(principal, "update", "appeal"), [principal]);

  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState<AppealRow | null>(null);

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
          <h2 className="text-xl font-semibold text-spo-ink">{t("appeals.title")}</h2>
          <p className="text-sm text-spo-muted">{t("appeals.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setOpen(true)}>{t("appeals.newAppeal")}</Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("appeals.headers.filedAt")}</TH>
            <TH>{t("appeals.headers.penalty")}</TH>
            <TH>{t("appeals.headers.narrative")}</TH>
            <TH>{t("appeals.headers.status")}</TH>
            <TH>{t("appeals.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {appeals.length === 0 ? (
            <EmptyTableRow colSpan={5}>{t("appeals.empty")}</EmptyTableRow>
          ) : (
            appeals.map((a) => (
              <TR key={a.id}>
                <TD className="text-xs text-spo-muted">
                  {dateFmt.format(new Date(a.filed_at))}
                </TD>
                <TD className="text-xs">{a.penalty_label ?? "—"}</TD>
                <TD className="max-w-xs truncate text-xs" title={a.narrative}>
                  {a.narrative}
                </TD>
                <TD>
                  <Badge tone={STATUS_TONES[a.status]}>
                    {t(`appeals.statuses.${a.status}`)}
                  </Badge>
                </TD>
                <TD>
                  {canResolve && a.status === "open" && (
                    <button
                      type="button"
                      onClick={() => setResolving(a)}
                      className="text-sm text-spo-green-deep hover:underline"
                    >
                      {t("appeals.resolve.title")}
                    </button>
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {open && (
        <AppealFormModal
          penaltyOptions={penaltyOptions}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            startTransition(() => router.refresh());
          }}
        />
      )}

      {resolving && (
        <ResolveAppealModal
          appeal={resolving}
          onClose={() => setResolving(null)}
          onDone={() => {
            setResolving(null);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}

function AppealFormModal({
  penaltyOptions,
  onClose,
  onDone,
}: {
  penaltyOptions: PenaltyOption[];
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("governance");
  const toast = useToast();
  const [penaltyId, setPenaltyId] = useState("");
  const [narrative, setNarrative] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fileAppeal({
      penalty_log_id: penaltyId,
      narrative: narrative.trim(),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.appealFiled") });
      onDone();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("appeals.form.createTitle")}>
      <form onSubmit={submit} className="space-y-4">
        <FormGroup label={t("appeals.form.penalty")}>
          <Select value={penaltyId} onChange={(e) => setPenaltyId(e.target.value)}>
            <option value="">{t("appeals.form.penaltyNone")}</option>
            {penaltyOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup label={t("appeals.form.narrative")} required>
          <Textarea
            rows={6}
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            required
          />
        </FormGroup>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>{t("appeals.newAppeal")}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ResolveAppealModal({
  appeal,
  onClose,
  onDone,
}: {
  appeal: AppealRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("governance");
  const toast = useToast();
  const [status, setStatus] = useState<"approved" | "rejected" | "withdrawn">("approved");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await resolveAppeal({
      id: appeal.id,
      status,
      resolution_notes: notes,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.appealResolved") });
      onDone();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("appeals.resolve.title")}>
      <form onSubmit={submit} className="space-y-4">
        <FormGroup label={t("appeals.resolve.status")} required>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            required
          >
            <option value="approved">{t("appeals.resolve.approved")}</option>
            <option value="rejected">{t("appeals.resolve.rejected")}</option>
            <option value="withdrawn">{t("appeals.resolve.withdrawn")}</option>
          </Select>
        </FormGroup>
        <FormGroup label={t("appeals.resolve.notes")}>
          <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormGroup>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>{t("common.save")}</Button>
        </div>
      </form>
    </Modal>
  );
}
