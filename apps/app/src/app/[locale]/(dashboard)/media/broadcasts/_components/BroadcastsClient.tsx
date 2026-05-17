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

import { createBroadcast, queueBroadcast } from "../../actions";

export type BroadcastRow = {
  id: string;
  channel: "sms" | "email" | "both";
  audience: "members" | "staff" | "all";
  subject: string | null;
  body_ar: string;
  status: "draft" | "queued" | "sending" | "sent" | "failed";
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  sent_at: string | null;
  created_at: string;
};

const STATUS_TONES: Record<BroadcastRow["status"], "neutral" | "amber" | "green" | "danger"> = {
  draft: "neutral",
  queued: "amber",
  sending: "amber",
  sent: "green",
  failed: "danger",
};

export function BroadcastsClient({
  broadcasts,
  principal,
  locale,
}: {
  broadcasts: BroadcastRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("media");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canCreate = useMemo(() => canPerform(principal, "create", "broadcast"), [principal]);
  const canQueue = useMemo(() => canPerform(principal, "update", "broadcast"), [principal]);
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

  async function queue(b: BroadcastRow) {
    const res = await queueBroadcast({ id: b.id });
    if (res.ok) {
      toast.push({
        tone: "success",
        title: t("toast.broadcastQueued"),
        description: t("broadcasts.actions.queueHint"),
      });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("broadcasts.title")}</h2>
          <p className="text-sm text-spo-muted">{t("broadcasts.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setOpen(true)}>{t("broadcasts.newBroadcast")}</Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("broadcasts.headers.channel")}</TH>
            <TH>{t("broadcasts.headers.audience")}</TH>
            <TH>{t("broadcasts.headers.subject")}</TH>
            <TH>{t("broadcasts.headers.recipients")}</TH>
            <TH>{t("broadcasts.headers.status")}</TH>
            <TH>{t("broadcasts.headers.createdAt")}</TH>
            <TH>{t("broadcasts.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {broadcasts.length === 0 ? (
            <EmptyTableRow colSpan={7}>{t("broadcasts.empty")}</EmptyTableRow>
          ) : (
            broadcasts.map((b) => (
              <TR key={b.id}>
                <TD>
                  <Badge tone="neutral">{t(`broadcasts.channels.${b.channel}`)}</Badge>
                </TD>
                <TD>{t(`broadcasts.audiences.${b.audience}`)}</TD>
                <TD className="max-w-xs truncate">{b.subject ?? "—"}</TD>
                <TD>{b.recipient_count}</TD>
                <TD>
                  <Badge tone={STATUS_TONES[b.status]}>
                    {t(`broadcasts.statuses.${b.status}`)}
                  </Badge>
                </TD>
                <TD className="text-xs text-spo-muted">
                  {dateFmt.format(new Date(b.created_at))}
                </TD>
                <TD>
                  {canQueue && b.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => queue(b)}
                      className="text-sm text-spo-green-deep hover:underline"
                    >
                      {t("broadcasts.actions.queue")}
                    </button>
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {open && (
        <BroadcastFormModal
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

function BroadcastFormModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("media");
  const toast = useToast();
  const [channel, setChannel] = useState<"sms" | "email" | "both">("email");
  const [audience, setAudience] = useState<"members" | "staff" | "all">("members");
  const [subject, setSubject] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await createBroadcast({
      channel,
      audience,
      subject,
      body_ar: bodyAr.trim(),
      body_en: bodyEn,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.broadcastCreated") });
      onDone();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("broadcasts.form.createTitle")}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("broadcasts.form.channel")} required>
            <Select
              value={channel}
              onChange={(e) => setChannel(e.target.value as typeof channel)}
              required
            >
              <option value="email">{t("broadcasts.channels.email")}</option>
              <option value="sms">{t("broadcasts.channels.sms")}</option>
              <option value="both">{t("broadcasts.channels.both")}</option>
            </Select>
          </FormGroup>
          <FormGroup label={t("broadcasts.form.audience")} required>
            <Select
              value={audience}
              onChange={(e) => setAudience(e.target.value as typeof audience)}
              required
            >
              <option value="members">{t("broadcasts.audiences.members")}</option>
              <option value="staff">{t("broadcasts.audiences.staff")}</option>
              <option value="all">{t("broadcasts.audiences.all")}</option>
            </Select>
          </FormGroup>
        </div>
        <FormGroup label={t("broadcasts.form.subject")}>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </FormGroup>
        <FormGroup label={t("broadcasts.form.bodyAr")} required>
          <Textarea
            rows={5}
            value={bodyAr}
            onChange={(e) => setBodyAr(e.target.value)}
            dir="rtl"
            required
          />
        </FormGroup>
        <FormGroup label={t("broadcasts.form.bodyEn")}>
          <Textarea
            rows={3}
            value={bodyEn}
            onChange={(e) => setBodyEn(e.target.value)}
            dir="ltr"
          />
        </FormGroup>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>{t("common.create")}</Button>
        </div>
      </form>
    </Modal>
  );
}
