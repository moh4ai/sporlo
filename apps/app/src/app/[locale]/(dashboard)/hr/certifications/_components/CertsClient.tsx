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

import { createCertification, deleteCertification } from "../../actions";

export type CertRow = {
  id: string;
  staff_profile_id: string;
  staff_name: string;
  name: string;
  issuer: string | null;
  issued_at: string | null;
  expires_at: string | null;
};

export type StaffOption = { id: string; label: string };

type CertStatus = "valid" | "expiringSoon" | "expired" | "noExpiry";

function statusOf(expiresAt: string | null): CertStatus {
  if (!expiresAt) return "noExpiry";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms < 0) return "expired";
  if (ms < 30 * 24 * 60 * 60 * 1000) return "expiringSoon";
  return "valid";
}

const STATUS_TONES: Record<CertStatus, "green" | "amber" | "danger" | "neutral"> = {
  valid: "green",
  expiringSoon: "amber",
  expired: "danger",
  noExpiry: "neutral",
};

export function CertsClient({
  certs,
  staffOptions,
  principal,
  locale,
}: {
  certs: CertRow[];
  staffOptions: StaffOption[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("hr");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canCreate = useMemo(() => canPerform(principal, "update", "hr"), [principal]);

  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<CertRow | null>(null);

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
          <h2 className="text-xl font-semibold text-spo-ink">{t("certs.title")}</h2>
          <p className="text-sm text-spo-muted">{t("certs.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setOpen(true)}>{t("certs.newCert")}</Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("certs.headers.staff")}</TH>
            <TH>{t("certs.headers.name")}</TH>
            <TH>{t("certs.headers.issuer")}</TH>
            <TH>{t("certs.headers.issued")}</TH>
            <TH>{t("certs.headers.expires")}</TH>
            <TH>{t("certs.headers.status")}</TH>
            <TH>{t("certs.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {certs.length === 0 ? (
            <EmptyTableRow colSpan={7}>{t("certs.empty")}</EmptyTableRow>
          ) : (
            certs.map((c) => {
              const status = statusOf(c.expires_at);
              return (
                <TR key={c.id}>
                  <TD className="font-medium">{c.staff_name}</TD>
                  <TD>{c.name}</TD>
                  <TD>{c.issuer ?? "—"}</TD>
                  <TD className="text-xs text-spo-muted">
                    {c.issued_at ? dateFmt.format(new Date(c.issued_at)) : "—"}
                  </TD>
                  <TD className="text-xs text-spo-muted">
                    {c.expires_at ? dateFmt.format(new Date(c.expires_at)) : "—"}
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONES[status]}>
                      {t(`certs.statuses.${status}`)}
                    </Badge>
                  </TD>
                  <TD>
                    <button
                      type="button"
                      onClick={() => setDeleting(c)}
                      className="text-sm text-spo-danger hover:underline"
                    >
                      {t("common.delete")}
                    </button>
                  </TD>
                </TR>
              );
            })
          )}
        </TBody>
      </Table>

      {open && (
        <CertFormModal
          staffOptions={staffOptions}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            startTransition(() => router.refresh());
          }}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        title={t("common.delete")}
        description={deleting?.name ?? ""}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        intent="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteCertification({ id: deleting.id });
          if (res.ok) {
            toast.push({ tone: "success", title: t("toast.certDeleted") });
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

function CertFormModal({
  staffOptions,
  onClose,
  onDone,
}: {
  staffOptions: StaffOption[];
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("hr");
  const toast = useToast();
  const [staffId, setStaffId] = useState(staffOptions[0]?.id ?? "");
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await createCertification({
      staff_profile_id: staffId,
      name: name.trim(),
      issuer,
      issued_at: issuedAt,
      expires_at: expiresAt,
      notes,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.certAdded") });
      onDone();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("certs.form.createTitle")}>
      <form onSubmit={submit} className="space-y-4">
        <FormGroup label={t("certs.form.staff")} required>
          <Select value={staffId} onChange={(e) => setStaffId(e.target.value)} required>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup label={t("certs.form.name")} required>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </FormGroup>
        <FormGroup label={t("certs.form.issuer")}>
          <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} />
        </FormGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("certs.form.issuedAt")}>
            <Input
              type="date"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
          <FormGroup label={t("certs.form.expiresAt")}>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
        </div>
        <FormGroup label={t("certs.form.notes")}>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormGroup>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {t("certs.newCert")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
