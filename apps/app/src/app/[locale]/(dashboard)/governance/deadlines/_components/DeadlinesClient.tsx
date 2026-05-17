"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { canPerform, type Principal } from "@sporlo/auth";
import {
  Badge,
  Button,
  ConfirmModal,
  EmptyTableRow,
  FormGroup,
  Input,
  Modal,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import { createDeadline, deleteDeadline, satisfyDeadline } from "../../actions";

export type DeadlineRow = {
  id: string;
  title_ar: string;
  due_at: string;
  warning_at: string | null;
  satisfied_at: string | null;
};

type Status = "satisfied" | "overdue" | "upcoming";

function statusOf(d: DeadlineRow): Status {
  if (d.satisfied_at) return "satisfied";
  return new Date(d.due_at).getTime() < Date.now() ? "overdue" : "upcoming";
}

const STATUS_TONES: Record<Status, "green" | "danger" | "amber"> = {
  satisfied: "green",
  overdue: "danger",
  upcoming: "amber",
};

export function DeadlinesClient({
  deadlines,
  principal,
  locale,
}: {
  deadlines: DeadlineRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("governance");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canCreate = useMemo(() => canPerform(principal, "create", "governance_deadline"), [principal]);
  const canUpdate = useMemo(() => canPerform(principal, "update", "governance_deadline"), [principal]);
  const canDelete = useMemo(() => canPerform(principal, "delete", "governance_deadline"), [principal]);

  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<DeadlineRow | null>(null);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [locale],
  );

  async function satisfy(d: DeadlineRow) {
    const res = await satisfyDeadline({ id: d.id });
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.deadlineSatisfied") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("deadlines.title")}</h2>
          <p className="text-sm text-spo-muted">{t("deadlines.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setOpen(true)}>{t("deadlines.newDeadline")}</Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("deadlines.headers.title")}</TH>
            <TH>{t("deadlines.headers.dueAt")}</TH>
            <TH>{t("deadlines.headers.warningAt")}</TH>
            <TH>{t("deadlines.headers.status")}</TH>
            <TH>{t("deadlines.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {deadlines.length === 0 ? (
            <EmptyTableRow colSpan={5}>{t("deadlines.empty")}</EmptyTableRow>
          ) : (
            deadlines.map((d) => {
              const status = statusOf(d);
              return (
                <TR key={d.id}>
                  <TD className="font-medium">{d.title_ar}</TD>
                  <TD className="text-xs text-spo-muted">
                    {dateFmt.format(new Date(d.due_at))}
                  </TD>
                  <TD className="text-xs text-spo-muted">
                    {d.warning_at ? dateFmt.format(new Date(d.warning_at)) : "—"}
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONES[status]}>
                      {t(`deadlines.statuses.${status}`)}
                    </Badge>
                  </TD>
                  <TD className="space-x-2 rtl:space-x-reverse">
                    {canUpdate && !d.satisfied_at && (
                      <button
                        type="button"
                        onClick={() => satisfy(d)}
                        className="text-sm text-spo-green-deep hover:underline"
                      >
                        {t("deadlines.actions.satisfy")}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setDeleting(d)}
                        className="text-sm text-spo-danger hover:underline"
                      >
                        {t("deadlines.actions.delete")}
                      </button>
                    )}
                  </TD>
                </TR>
              );
            })
          )}
        </TBody>
      </Table>

      {open && (
        <DeadlineFormModal
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            startTransition(() => router.refresh());
          }}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        title={t("deadlines.actions.delete")}
        description={deleting?.title_ar ?? ""}
        confirmLabel={t("deadlines.actions.delete")}
        cancelLabel={t("common.cancel")}
        intent="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteDeadline({ id: deleting.id });
          if (res.ok) {
            toast.push({ tone: "success", title: t("toast.deadlineDeleted") });
            setDeleting(null);
            startTransition(() => router.refresh());
          } else {
            toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
          }
        }}
      />
    </div>
  );
}

function DeadlineFormModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("governance");
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [warningAt, setWarningAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await createDeadline({
      title_ar: title.trim(),
      due_at: dueAt,
      warning_at: warningAt,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.deadlineCreated") });
      onDone();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("deadlines.form.createTitle")}>
      <form onSubmit={submit} className="space-y-4">
        <FormGroup label={t("deadlines.form.titleAr")} required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </FormGroup>
        <FormGroup label={t("deadlines.form.dueAt")} required>
          <Input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            required
            dir="ltr"
          />
        </FormGroup>
        <FormGroup label={t("deadlines.form.warningAt")}>
          <Input
            type="datetime-local"
            value={warningAt}
            onChange={(e) => setWarningAt(e.target.value)}
            dir="ltr"
          />
        </FormGroup>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {t("common.create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
