"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import {
  Badge,
  Button,
  Card,
  EmptyTableRow,
  Input,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@sporlo/ui";
import { enqueue, flush, size as queueSize, type QueuedItem } from "@sporlo/offline";

import { useRouter } from "@/i18n/navigation";

import { recordSessionAttendance } from "../../actions";

const CHANNEL = "academy-attendance";

interface QueuedAttendance {
  session_id: string;
  member_id: string;
  present: boolean;
  note: string | null;
}

export interface MemberOption {
  id: string;
  full_name: string;
  member_number: string | null;
}

export interface AttendanceState {
  member_id: string;
  present: boolean | null;
  note: string;
}

export function AttendanceClient({
  sessionId,
  members,
  existing,
}: {
  sessionId: string;
  members: MemberOption[];
  existing: Array<{ member_id: string; present: boolean; note: string | null }>;
}) {
  const t = useTranslations("academy");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isOnline, setIsOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [rows, setRows] = useState<AttendanceState[]>(() =>
    members.map((m) => {
      const found = existing.find((e) => e.member_id === m.id);
      return {
        member_id: m.id,
        present: found?.present ?? null,
        note: found?.note ?? "",
      };
    }),
  );

  // Track online/offline + flush queue on reconnect.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    const onOnline = async () => {
      setIsOnline(true);
      await drainQueue();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void drainQueue();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function drainQueue() {
    const sent = await flush<QueuedAttendance>(CHANNEL, async (item) => {
      const res = await recordSessionAttendance({
        session_id: item.payload.session_id,
        member_id: item.payload.member_id,
        present: item.payload.present,
        note: item.payload.note ?? undefined,
        client_id: item.id,
        recorded_offline: true,
      });
      return res.ok;
    });
    const remaining = await queueSize(CHANNEL);
    setPending(remaining);
    if (sent > 0) {
      toast.push({ tone: "success", title: t("attendance.syncedNow") });
      startTransition(() => router.refresh());
    }
  }

  function setPresent(memberId: string, present: boolean) {
    setRows((rs) =>
      rs.map((r) => (r.member_id === memberId ? { ...r, present } : r)),
    );
    void persistOne(memberId, present);
  }

  function setNote(memberId: string, note: string) {
    setRows((rs) => rs.map((r) => (r.member_id === memberId ? { ...r, note } : r)));
  }

  async function persistOne(memberId: string, present: boolean) {
    const row = rows.find((r) => r.member_id === memberId);
    const note = row?.note ?? "";
    const clientId = crypto.randomUUID();
    const payload: QueuedAttendance = {
      session_id: sessionId,
      member_id: memberId,
      present,
      note: note.trim() || null,
    };
    if (!navigator.onLine) {
      const item: QueuedItem<QueuedAttendance> = {
        id: clientId,
        channel: CHANNEL,
        payload,
        enqueued_at: Date.now(),
      };
      await enqueue(item);
      setPending((p) => p + 1);
      return;
    }
    const res = await recordSessionAttendance({
      session_id: sessionId,
      member_id: memberId,
      present,
      note: note.trim() || undefined,
      client_id: clientId,
      recorded_offline: false,
    });
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.attendanceSaved") });
    } else {
      // Queue on failure for retry.
      const item: QueuedItem<QueuedAttendance> = {
        id: clientId,
        channel: CHANNEL,
        payload,
        enqueued_at: Date.now(),
      };
      await enqueue(item);
      setPending((p) => p + 1);
      toast.push({ tone: "error", title: t("attendance.offlineHint") });
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-spo-ink">{t("attendance.title")}</h3>
        <div className="flex items-center gap-2 text-xs">
          {isOnline ? (
            <Badge tone="green">online</Badge>
          ) : (
            <Badge tone="amber">offline</Badge>
          )}
          {pending > 0 && (
            <span className="text-spo-muted">
              {t("attendance.queueCount", { n: pending })}
            </span>
          )}
        </div>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-spo-muted">{t("attendance.empty")}</p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Member</TH>
              <TH />
              <TH>{t("attendance.noteLabel")}</TH>
            </TR>
          </THead>
          <TBody>
            {members.length === 0 ? (
              <EmptyTableRow colSpan={3}>{t("attendance.empty")}</EmptyTableRow>
            ) : (
              members.map((m) => {
                const row = rows.find((r) => r.member_id === m.id)!;
                return (
                  <TR key={m.id}>
                    <TD className="font-medium">
                      {m.full_name}
                      {m.member_number && (
                        <code className="ms-2 rounded bg-spo-paper px-1 py-0.5 text-xs">
                          {m.member_number}
                        </code>
                      )}
                    </TD>
                    <TD>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPresent(m.id, true)}
                          className={
                            "rounded-pill border px-3 py-1 text-xs " +
                            (row.present === true
                              ? "border-spo-green bg-spo-green-soft text-spo-green-deep"
                              : "border-spo-line bg-white text-spo-muted hover:bg-spo-paper")
                          }
                        >
                          {t("attendance.presentLabel")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPresent(m.id, false)}
                          className={
                            "rounded-pill border px-3 py-1 text-xs " +
                            (row.present === false
                              ? "border-spo-danger bg-spo-danger/10 text-spo-danger"
                              : "border-spo-line bg-white text-spo-muted hover:bg-spo-paper")
                          }
                        >
                          {t("attendance.absentLabel")}
                        </button>
                      </div>
                    </TD>
                    <TD>
                      <Input
                        value={row.note}
                        onChange={(e) => setNote(m.id, e.target.value)}
                        className="h-9"
                      />
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      )}

      {!isOnline && (
        <p className="text-xs text-spo-muted">{t("attendance.offlineHint")}</p>
      )}

      <div className="text-xs text-spo-muted">
        <Button variant="ghost" onClick={() => void drainQueue()}>
          Sync now
        </Button>
      </div>
    </Card>
  );
}
