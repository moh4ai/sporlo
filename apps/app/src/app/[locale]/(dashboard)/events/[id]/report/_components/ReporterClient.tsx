"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import {
  Badge,
  Button,
  Card,
  FormGroup,
  Input,
  Select,
  useToast,
} from "@sporlo/ui";
import { enqueue, flush, list, size as queueSize, type QueuedItem } from "@sporlo/offline";

import { useRouter } from "@/i18n/navigation";

import { recordMatchEvent } from "../../../actions";

const CHANNEL = "match-events";

const EVENT_TYPES = [
  "goal",
  "own_goal",
  "penalty",
  "yellow_card",
  "red_card",
  "substitution",
  "injury",
  "note",
] as const;

type EventType = (typeof EVENT_TYPES)[number];

export type MatchEventRow = {
  id: string;
  minute: number;
  type: EventType;
  team: "home" | "away";
  player_name: string | null;
  recorded_offline: boolean;
  created_at: string;
};

interface QueuedEvent {
  fixture_id: string;
  minute: number;
  type: EventType;
  team: "home" | "away";
  player_name: string | null;
}

export function ReporterClient({
  fixtureId,
  serverEvents,
  locale,
}: {
  fixtureId: string;
  serverEvents: MatchEventRow[];
  locale: "ar" | "en";
}) {
  const t = useTranslations("events.report");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isOnline, setIsOnline] = useState(true);
  const [pending, setPending] = useState(0);

  // Form state
  const [minute, setMinute] = useState("1");
  const [type, setType] = useState<EventType>("goal");
  const [team, setTeam] = useState<"home" | "away">("home");
  const [player, setPlayer] = useState("");

  const sortedServerEvents = useMemo(
    () => [...serverEvents].sort((a, b) => a.minute - b.minute),
    [serverEvents],
  );

  // Track online status + flush queued events when we come back.
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
    // Initial drain in case we have queued events from a previous session.
    void drainQueue();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function drainQueue() {
    const sent = await flush<QueuedEvent>(CHANNEL, async (item) => {
      const res = await recordMatchEvent({
        fixture_id: item.payload.fixture_id,
        minute: item.payload.minute,
        type: item.payload.type,
        team: item.payload.team,
        player_name: item.payload.player_name ?? undefined,
        client_id: item.id,
        recorded_offline: true,
      });
      return res.ok;
    });
    const remaining = await queueSize(CHANNEL);
    setPending(remaining);
    if (sent > 0) {
      toast.push({ tone: "success", title: t("syncedNow") });
      startTransition(() => router.refresh());
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const clientId = crypto.randomUUID();
    const payload: QueuedEvent = {
      fixture_id: fixtureId,
      minute: Number(minute),
      type,
      team,
      player_name: player.trim() || null,
    };

    if (!navigator.onLine) {
      const item: QueuedItem<QueuedEvent> = {
        id: clientId,
        channel: CHANNEL,
        payload,
        enqueued_at: Date.now(),
      };
      await enqueue(item);
      setPending((p) => p + 1);
      toast.push({ tone: "info", title: t("offlineNote") });
      resetForm();
      return;
    }

    const res = await recordMatchEvent({
      ...payload,
      player_name: payload.player_name ?? undefined,
      client_id: clientId,
      recorded_offline: false,
    });
    if (res.ok) {
      toast.push({ tone: "success", title: t("addEvent") });
      resetForm();
      startTransition(() => router.refresh());
    } else {
      // Network failed mid-request — queue for retry.
      const item: QueuedItem<QueuedEvent> = {
        id: clientId,
        channel: CHANNEL,
        payload,
        enqueued_at: Date.now(),
      };
      await enqueue(item);
      setPending((p) => p + 1);
      toast.push({ tone: "info", title: t("offlineNote") });
    }
  }

  function resetForm() {
    setMinute(String(Math.min(120, Number(minute) + 1)));
    setPlayer("");
  }

  // Locale param reserved for future locale-specific number/time formatting.
  void locale;

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          {isOnline ? (
            <Badge tone="green">online</Badge>
          ) : (
            <Badge tone="amber">offline</Badge>
          )}
          {pending > 0 && (
            <span className="text-spo-muted">
              {t("queueCount", { n: pending })}
            </span>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 grid-cols-2">
            <FormGroup label={t("minute")} required>
              <Input
                type="number"
                min={0}
                max={200}
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                dir="ltr"
                required
              />
            </FormGroup>
            <FormGroup label={t("team")} required>
              <Select value={team} onChange={(e) => setTeam(e.target.value as "home" | "away")}>
                <option value="home">{t("teams.home")}</option>
                <option value="away">{t("teams.away")}</option>
              </Select>
            </FormGroup>
          </div>
          <FormGroup label={t("type")} required>
            <Select value={type} onChange={(e) => setType(e.target.value as EventType)}>
              {EVENT_TYPES.map((k) => (
                <option key={k} value={k}>
                  {t(`types.${k}`)}
                </option>
              ))}
            </Select>
          </FormGroup>
          <FormGroup label={t("player")}>
            <Input value={player} onChange={(e) => setPlayer(e.target.value)} />
          </FormGroup>
          <Button type="submit" className="w-full">
            {t("addEvent")}
          </Button>
        </form>
      </Card>

      {sortedServerEvents.length > 0 && (
        <ul className="space-y-1 text-sm">
          {sortedServerEvents.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded-md border border-spo-line bg-white px-3 py-2"
            >
              <span>
                <code className="rounded bg-spo-paper px-1.5 py-0.5 text-xs">
                  {e.minute}&apos;
                </code>{" "}
                <span className="text-spo-ink-2">{t(`types.${e.type}`)}</span>{" "}
                <span className="text-spo-muted">· {t(`teams.${e.team}`)}</span>
              </span>
              <span className="text-xs text-spo-muted">
                {e.player_name ?? ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
