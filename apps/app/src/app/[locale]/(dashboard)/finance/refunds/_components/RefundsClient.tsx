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
  Textarea,
  TR,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import {
  approveRefund,
  rejectRefund,
  requestRefund,
} from "../../actions";

type RefundStatus = "requested" | "approved" | "rejected" | "completed" | "failed";

const STATUS_TONES: Record<RefundStatus, "amber" | "blue" | "danger" | "green" | "neutral"> = {
  requested: "amber",
  approved: "blue",
  rejected: "neutral",
  completed: "green",
  failed: "danger",
};

export type RefundRow = {
  id: string;
  payment_id: string;
  amount_sar: number;
  reason: string | null;
  status: RefundStatus;
  member_name: string;
  payment_amount: number;
  payment_provider: string;
  created_at: string;
};

export type RefundablePayment = {
  id: string;
  amount_sar: number;
  member_name: string;
  provider: string;
};

export function RefundsClient({
  refunds,
  principal,
  refundablePayments,
  locale,
}: {
  refunds: RefundRow[];
  principal: Principal;
  refundablePayments: RefundablePayment[];
  locale: "ar" | "en";
}) {
  const t = useTranslations("finance");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const canRequest = useMemo(() => canPerform(principal, "refund", "payment"), [principal]);
  const canApprove = useMemo(() => canPerform(principal, "approve", "refund"), [principal]);

  const [requestOpen, setRequestOpen] = useState(false);
  const [rejecting, setRejecting] = useState<RefundRow | null>(null);

  const sarFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        style: "currency",
        currency: "SAR",
      }),
    [locale],
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

  async function onApprove(r: RefundRow) {
    const res = await approveRefund({ id: r.id });
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.refundApproved") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("refunds.title")}</h2>
          <p className="text-sm text-spo-muted">{t("refunds.subtitle")}</p>
        </div>
        {canRequest && (
          <Button onClick={() => setRequestOpen(true)}>{t("refunds.newRequest")}</Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("refunds.headers.payment")}</TH>
            <TH>{t("refunds.headers.amount")}</TH>
            <TH>{t("refunds.headers.status")}</TH>
            <TH>{t("refunds.headers.createdAt")}</TH>
            <TH>{t("refunds.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {refunds.length === 0 ? (
            <EmptyTableRow colSpan={5}>{t("refunds.empty")}</EmptyTableRow>
          ) : (
            refunds.map((r) => (
              <TR key={r.id}>
                <TD>
                  <div className="font-medium">{r.member_name}</div>
                  <div className="text-xs text-spo-muted">
                    {r.payment_provider} · {sarFmt.format(r.payment_amount)}
                  </div>
                </TD>
                <TD>{sarFmt.format(r.amount_sar)}</TD>
                <TD>
                  <Badge tone={STATUS_TONES[r.status]}>
                    {t(`refunds.statuses.${r.status}`)}
                  </Badge>
                </TD>
                <TD className="text-xs text-spo-muted">
                  {dateFmt.format(new Date(r.created_at))}
                </TD>
                <TD className="space-x-2 rtl:space-x-reverse">
                  {r.status === "requested" && canApprove && (
                    <>
                      <button
                        type="button"
                        onClick={() => onApprove(r)}
                        className="text-sm text-spo-green-deep hover:underline"
                      >
                        {t("refunds.actions.approve")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejecting(r)}
                        className="text-sm text-spo-danger hover:underline"
                      >
                        {t("refunds.actions.reject")}
                      </button>
                    </>
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {requestOpen && (
        <RequestRefundModal
          payments={refundablePayments}
          locale={locale}
          onClose={() => setRequestOpen(false)}
          onDone={() => {
            setRequestOpen(false);
            startTransition(() => router.refresh());
          }}
        />
      )}

      {rejecting && (
        <RejectRefundModal
          refund={rejecting}
          onClose={() => setRejecting(null)}
          onDone={() => {
            setRejecting(null);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}

function RequestRefundModal({
  payments,
  locale,
  onClose,
  onDone,
}: {
  payments: RefundablePayment[];
  locale: "ar" | "en";
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("finance");
  const toast = useToast();
  const [paymentId, setPaymentId] = useState(payments[0]?.id ?? "");
  const [amount, setAmount] = useState(String(payments[0]?.amount_sar ?? 0));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    style: "currency",
    currency: "SAR",
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const res = await requestRefund({
      payment_id: paymentId,
      amount_sar: Number(amount),
      reason,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.refundRequested") });
      onDone();
    } else {
      if (res.error === "amount-exceeds-payment") setErr(t("refunds.errors.amountExceeds"));
      else setErr(res.error);
      toast.push({ tone: "error", title: t("toast.saveFailed") });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("refunds.requestForm.title")}>
      {payments.length === 0 ? (
        <p className="text-sm text-spo-muted">{t("refunds.requestForm.noPayments")}</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <FormGroup label={t("refunds.requestForm.paymentLabel")} required>
            <Select
              value={paymentId}
              onChange={(e) => {
                setPaymentId(e.target.value);
                const p = payments.find((pp) => pp.id === e.target.value);
                if (p) setAmount(String(p.amount_sar));
              }}
            >
              {payments.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.member_name} — {fmt.format(p.amount_sar)} ({p.provider})
                </option>
              ))}
            </Select>
          </FormGroup>
          <FormGroup label={t("refunds.requestForm.amount")} required>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
          <FormGroup label={t("refunds.requestForm.reason")}>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormGroup>
          {err && <p className="text-sm text-spo-danger">{err}</p>}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {t("refunds.newRequest")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function RejectRefundModal({
  refund,
  onClose,
  onDone,
}: {
  refund: RefundRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("finance");
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    const res = await rejectRefund({ id: refund.id, reason });
    setBusy(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.refundRejected") });
      onDone();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("refunds.rejectForm.title")}>
      <div className="space-y-4">
        <FormGroup label={t("refunds.rejectForm.reason")}>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormGroup>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={confirm} disabled={busy}>
            {t("refunds.actions.reject")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
