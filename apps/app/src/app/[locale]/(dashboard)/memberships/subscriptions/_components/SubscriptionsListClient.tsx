"use client";

import { useMemo, useState, useTransition } from "react";
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
  Pagination,
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

import { Link, useRouter } from "@/i18n/navigation";

import {
  cancelSubscription,
  freezeSubscription,
  recordManualPayment,
  unfreezeSubscription,
} from "../../actions";

type SubStatus = "pending" | "active" | "frozen" | "cancelled" | "expired";

const STATUS_TONES: Record<SubStatus, "neutral" | "green" | "amber" | "blue" | "danger"> = {
  pending: "amber",
  active: "green",
  frozen: "blue",
  cancelled: "danger",
  expired: "neutral",
};

export type SubscriptionRow = {
  id: string;
  status: SubStatus;
  member_id: string;
  member_name: string;
  plan_name: string;
  plan_price: number;
  starts_at: string | null;
  ends_at: string | null;
};

const PAGE_SIZE = 20;

type ActionState =
  | { kind: "idle" }
  | { kind: "freeze"; sub: SubscriptionRow }
  | { kind: "cancel"; sub: SubscriptionRow }
  | { kind: "manual"; sub: SubscriptionRow };

export function SubscriptionsListClient({
  subs,
  principal,
  locale,
}: {
  subs: SubscriptionRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("memberships");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const canManage = useMemo(
    () => canPerform(principal, "update", "subscription"),
    [principal],
  );
  const canRecord = useMemo(
    () => canPerform(principal, "create", "subscription"),
    [principal],
  );
  const canCancel = useMemo(
    () => canPerform(principal, "delete", "subscription"),
    [principal],
  );

  const [status, setStatus] = useState<SubStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<ActionState>({ kind: "idle" });

  const filtered = useMemo(() => {
    return subs.filter((s) => (status === "all" ? true : s.status === status));
  }, [subs, status]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [locale],
  );
  const fmtDate = (s: string | null) =>
    s ? dateFmt.format(new Date(s)) : "—";

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleUnfreeze(sub: SubscriptionRow) {
    const res = await unfreezeSubscription({ id: sub.id });
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.subscriptionUnfrozen") });
      refresh();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-spo-ink">{t("subscriptions.title")}</h2>
        <p className="text-sm text-spo-muted">{t("subscriptions.subtitle")}</p>
      </div>

      <div className="grid gap-2 sm:max-w-xs">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as typeof status);
            setPage(1);
          }}
        >
          <option value="all">{t("subscriptions.filters.all")}</option>
          <option value="pending">{t("subscriptions.statuses.pending")}</option>
          <option value="active">{t("subscriptions.statuses.active")}</option>
          <option value="frozen">{t("subscriptions.statuses.frozen")}</option>
          <option value="cancelled">{t("subscriptions.statuses.cancelled")}</option>
          <option value="expired">{t("subscriptions.statuses.expired")}</option>
        </Select>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("subscriptions.headers.member")}</TH>
            <TH>{t("subscriptions.headers.plan")}</TH>
            <TH>{t("subscriptions.headers.status")}</TH>
            <TH>{t("subscriptions.headers.starts")}</TH>
            <TH>{t("subscriptions.headers.ends")}</TH>
            <TH>{t("subscriptions.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {rows.length === 0 ? (
            <EmptyTableRow colSpan={6}>{t("subscriptions.empty")}</EmptyTableRow>
          ) : (
            rows.map((s) => (
              <TR key={s.id}>
                <TD className="font-medium">
                  <Link
                    href={`/memberships/members/${s.member_id}`}
                    className="text-spo-green-deep hover:underline"
                  >
                    {s.member_name}
                  </Link>
                </TD>
                <TD>{s.plan_name}</TD>
                <TD>
                  <Badge tone={STATUS_TONES[s.status]}>
                    {t(`subscriptions.statuses.${s.status}`)}
                  </Badge>
                </TD>
                <TD className="text-xs text-spo-muted">{fmtDate(s.starts_at)}</TD>
                <TD className="text-xs text-spo-muted">{fmtDate(s.ends_at)}</TD>
                <TD className="space-x-2 rtl:space-x-reverse">
                  {s.status === "pending" && canRecord && (
                    <button
                      type="button"
                      onClick={() => setAction({ kind: "manual", sub: s })}
                      className="text-sm text-spo-green-deep hover:underline"
                    >
                      {t("subscriptions.actions.recordManualPayment")}
                    </button>
                  )}
                  {s.status === "active" && canManage && (
                    <button
                      type="button"
                      onClick={() => setAction({ kind: "freeze", sub: s })}
                      className="text-sm text-spo-muted hover:text-spo-ink-2"
                    >
                      {t("subscriptions.actions.freeze")}
                    </button>
                  )}
                  {s.status === "frozen" && canManage && (
                    <button
                      type="button"
                      onClick={() => handleUnfreeze(s)}
                      className="text-sm text-spo-muted hover:text-spo-ink-2"
                    >
                      {t("subscriptions.actions.unfreeze")}
                    </button>
                  )}
                  {(s.status === "active" || s.status === "pending" || s.status === "frozen") &&
                    canCancel && (
                      <button
                        type="button"
                        onClick={() => setAction({ kind: "cancel", sub: s })}
                        className="text-sm text-spo-danger hover:underline"
                      >
                        {t("subscriptions.actions.cancel")}
                      </button>
                    )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {pageCount > 1 && (
        <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      )}

      {action.kind === "manual" && (
        <ManualPaymentModal
          sub={action.sub}
          onClose={() => setAction({ kind: "idle" })}
          onDone={() => {
            setAction({ kind: "idle" });
            refresh();
          }}
        />
      )}

      {action.kind === "freeze" && (
        <FreezeModal
          sub={action.sub}
          onClose={() => setAction({ kind: "idle" })}
          onDone={() => {
            setAction({ kind: "idle" });
            refresh();
          }}
        />
      )}

      {action.kind === "cancel" && (
        <ConfirmCancelModal
          sub={action.sub}
          onCancel={() => setAction({ kind: "idle" })}
          onDone={() => {
            setAction({ kind: "idle" });
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ManualPaymentModal({
  sub,
  onClose,
  onDone,
}: {
  sub: SubscriptionRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("memberships");
  const toast = useToast();
  const [amount, setAmount] = useState(String(sub.plan_price));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const res = await recordManualPayment({
      subscription_id: sub.id,
      amount_sar: Number(amount),
      note,
    });
    setBusy(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.paymentRecorded") });
      onDone();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("manualPayment.title")}>
      <div className="space-y-4">
        <p className="text-sm text-spo-muted">{t("manualPayment.subtitle")}</p>
        <FormGroup label={t("manualPayment.amount")} required>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            dir="ltr"
          />
        </FormGroup>
        <FormGroup label={t("manualPayment.note")}>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </FormGroup>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy}>
            {t("manualPayment.submit")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function FreezeModal({
  sub,
  onClose,
  onDone,
}: {
  sub: SubscriptionRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("memberships");
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const oneMonth = new Date();
  oneMonth.setMonth(oneMonth.getMonth() + 1);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(oneMonth.toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const res = await freezeSubscription({
      id: sub.id,
      frozen_from: from,
      frozen_to: to,
    });
    setBusy(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.subscriptionFrozen") });
      onDone();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("subscriptions.freezeForm.title")}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("subscriptions.freezeForm.from")} required>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
          <FormGroup label={t("subscriptions.freezeForm.to")} required>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy}>
            {t("subscriptions.actions.freeze")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ConfirmCancelModal({
  sub,
  onCancel,
  onDone,
}: {
  sub: SubscriptionRow;
  onCancel: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("memberships");
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    const res = await cancelSubscription({ id: sub.id, reason });
    setBusy(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.subscriptionCancelled") });
      onDone();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Modal open onClose={onCancel} title={t("subscriptions.cancelForm.title")}>
      <div className="space-y-3">
        <p className="text-sm text-spo-muted">{t("subscriptions.cancelForm.body")}</p>
        <FormGroup label={t("subscriptions.cancelForm.reason")}>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormGroup>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={confirm} disabled={busy}>
            {t("subscriptions.actions.cancel")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
