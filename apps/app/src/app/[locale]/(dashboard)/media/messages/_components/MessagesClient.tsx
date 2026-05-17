"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { canPerform, type Principal } from "@sporlo/auth";
import {
  Badge,
  Button,
  Card,
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
  createThread,
  postMessage,
  setThreadStatus,
} from "../../actions";

export type ThreadRow = {
  id: string;
  subject: string;
  member_name: string | null;
  status: "open" | "resolved" | "archived";
  last_message_at: string;
};

export type MessageRow = {
  id: string;
  sender_role: "member" | "staff" | "system";
  body: string;
  created_at: string;
};

export type MemberOption = { id: string; label: string };

const STATUS_TONES: Record<ThreadRow["status"], "amber" | "green" | "neutral"> = {
  open: "amber",
  resolved: "green",
  archived: "neutral",
};

export function MessagesClient({
  threads,
  selected,
  messages,
  memberOptions,
  principal,
  locale,
}: {
  threads: ThreadRow[];
  selected: ThreadRow | null;
  messages: MessageRow[];
  memberOptions: MemberOption[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("media");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canCreate = useMemo(() => canPerform(principal, "create", "message_thread"), [principal]);
  const canResolve = useMemo(() => canPerform(principal, "update", "message_thread"), [principal]);
  const canReply = useMemo(() => canPerform(principal, "create", "message"), [principal]);

  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  function selectThread(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("t", id);
    window.location.href = url.toString();
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setSubmitting(true);
    const res = await postMessage({ thread_id: selected.id, body: reply.trim() });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.messageSent") });
      setReply("");
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  async function toggleResolved() {
    if (!selected) return;
    const next = selected.status === "open" ? "resolved" : "open";
    const res = await setThreadStatus({ id: selected.id, status: next });
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.threadResolved") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("messages.title")}</h2>
          <p className="text-sm text-spo-muted">{t("messages.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setOpen(true)}>{t("messages.newThread")}</Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        {/* Thread list */}
        <div>
          <Table>
            <THead>
              <TR>
                <TH>{t("messages.headers.subject")}</TH>
                <TH>{t("messages.headers.member")}</TH>
                <TH>{t("messages.headers.status")}</TH>
              </TR>
            </THead>
            <TBody>
              {threads.length === 0 ? (
                <EmptyTableRow colSpan={3}>{t("messages.empty")}</EmptyTableRow>
              ) : (
                threads.map((th) => (
                  <TR key={th.id}>
                    <TD>
                      <button
                        type="button"
                        onClick={() => selectThread(th.id)}
                        className={
                          "block w-full text-left font-medium hover:underline " +
                          (selected?.id === th.id ? "text-spo-green-deep" : "text-spo-ink")
                        }
                      >
                        {th.subject}
                      </button>
                      <div className="text-xs text-spo-muted">
                        {dateFmt.format(new Date(th.last_message_at))}
                      </div>
                    </TD>
                    <TD>{th.member_name ?? "—"}</TD>
                    <TD>
                      <Badge tone={STATUS_TONES[th.status]}>
                        {t(`messages.statuses.${th.status}`)}
                      </Badge>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </div>

        {/* Selected thread */}
        <div>
          {!selected ? (
            <Card>
              <p className="text-sm text-spo-muted">{t("messages.noSelection")}</p>
            </Card>
          ) : (
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-spo-ink">{selected.subject}</h3>
                  <p className="text-xs text-spo-muted">{selected.member_name ?? "—"}</p>
                </div>
                {canResolve && (
                  <button
                    type="button"
                    onClick={toggleResolved}
                    className="text-sm text-spo-green-deep hover:underline"
                  >
                    {selected.status === "open"
                      ? t("messages.actions.resolve")
                      : t("messages.actions.reopen")}
                  </button>
                )}
              </div>

              <div className="max-h-96 space-y-2 overflow-y-auto border-y border-spo-line py-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-spo-muted">—</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={
                        "max-w-[80%] rounded-md px-3 py-2 text-sm " +
                        (m.sender_role === "staff"
                          ? "ml-auto bg-spo-green-soft text-spo-green-deep"
                          : "bg-spo-paper text-spo-ink")
                      }
                    >
                      <div className="whitespace-pre-wrap">{m.body}</div>
                      <div className="mt-1 text-xs text-spo-muted">
                        {dateFmt.format(new Date(m.created_at))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {canReply && selected.status === "open" && (
                <form onSubmit={sendReply} className="mt-3 flex items-end gap-2">
                  <Textarea
                    rows={2}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={t("messages.reply.placeholder")}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={submitting || !reply.trim()}>
                    {t("messages.reply.send")}
                  </Button>
                </form>
              )}
            </Card>
          )}
        </div>
      </div>

      {open && (
        <ThreadFormModal
          memberOptions={memberOptions}
          onClose={() => setOpen(false)}
          onDone={(id) => {
            setOpen(false);
            const url = new URL(window.location.href);
            url.searchParams.set("t", id);
            window.location.href = url.toString();
          }}
        />
      )}
    </div>
  );
}

function ThreadFormModal({
  memberOptions,
  onClose,
  onDone,
}: {
  memberOptions: MemberOption[];
  onClose: () => void;
  onDone: (id: string) => void;
}) {
  const t = useTranslations("media");
  const toast = useToast();
  const [memberId, setMemberId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await createThread({
      member_id: memberId,
      subject: subject.trim(),
      initial_body: body.trim(),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.threadCreated") });
      onDone(res.data.id);
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("messages.form.createTitle")}>
      <form onSubmit={submit} className="space-y-4">
        <FormGroup label={t("messages.form.member")}>
          <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">{t("messages.form.memberNone")}</option>
            {memberOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup label={t("messages.form.subject")} required>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </FormGroup>
        <FormGroup label={t("messages.form.initialBody")} required>
          <Textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </FormGroup>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>{t("common.send")}</Button>
        </div>
      </form>
    </Modal>
  );
}
