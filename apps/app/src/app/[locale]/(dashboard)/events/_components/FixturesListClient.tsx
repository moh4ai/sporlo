"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useTranslations } from "next-intl";

import { canPerform, type Principal } from "@sporlo/auth";
import {
  Badge,
  Button,
  Drawer,
  EmptyTableRow,
  FormGroup,
  Input,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@sporlo/ui";

import { Link, useRouter } from "@/i18n/navigation";

import {
  archiveFixture,
  createFixture,
  updateFixture,
} from "../actions";

type FixtureStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
const STATUS_TONES: Record<FixtureStatus, "amber" | "blue" | "green" | "neutral"> = {
  scheduled: "amber",
  in_progress: "blue",
  completed: "green",
  cancelled: "neutral",
};

export type FixtureRow = {
  id: string;
  opponent_ar: string;
  opponent_en: string;
  kickoff_at: string;
  venue: string | null;
  status: FixtureStatus;
  home_score: number | null;
  away_score: number | null;
};

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; fixture: FixtureRow };

export function FixturesListClient({
  fixtures,
  principal,
  locale,
}: {
  fixtures: FixtureRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("events");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canCreate = useMemo(() => canPerform(principal, "create", "events"), [principal]);
  const canUpdate = useMemo(() => canPerform(principal, "update", "events"), [principal]);

  const [drawer, setDrawer] = useState<DrawerState>({ open: false });

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("fixtures.title")}</h2>
          <p className="text-sm text-spo-muted">{t("fixtures.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
            {t("fixtures.newFixture")}
          </Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("fixtures.headers.opponent")}</TH>
            <TH>{t("fixtures.headers.kickoff")}</TH>
            <TH>{t("fixtures.headers.venue")}</TH>
            <TH>{t("fixtures.headers.status")}</TH>
            <TH>{t("fixtures.headers.score")}</TH>
            <TH>{t("fixtures.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {fixtures.length === 0 ? (
            <EmptyTableRow colSpan={6}>{t("fixtures.empty")}</EmptyTableRow>
          ) : (
            fixtures.map((f) => (
              <TR key={f.id}>
                <TD className="font-medium">
                  <Link
                    href={`/events/${f.id}`}
                    className="text-spo-green-deep hover:underline"
                  >
                    {locale === "ar" ? f.opponent_ar : f.opponent_en}
                  </Link>
                </TD>
                <TD className="text-xs text-spo-muted">
                  {dateFmt.format(new Date(f.kickoff_at))}
                </TD>
                <TD>{f.venue ?? "—"}</TD>
                <TD>
                  <Badge tone={STATUS_TONES[f.status]}>
                    {t(`fixtures.statuses.${f.status}`)}
                  </Badge>
                </TD>
                <TD>
                  {f.home_score != null && f.away_score != null
                    ? `${f.home_score} - ${f.away_score}`
                    : "—"}
                </TD>
                <TD className="space-x-2 rtl:space-x-reverse">
                  {canUpdate && (
                    <button
                      type="button"
                      onClick={() => setDrawer({ open: true, mode: "edit", fixture: f })}
                      className="text-sm text-spo-green-deep hover:underline"
                    >
                      {t("common.edit")}
                    </button>
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <FixtureFormDrawer
        state={drawer}
        onClose={() => setDrawer({ open: false })}
        onSaved={() => {
          setDrawer({ open: false });
          startTransition(() => router.refresh());
        }}
        onCancelled={() => {
          setDrawer({ open: false });
          startTransition(() => router.refresh());
        }}
      />

      <span className="sr-only" aria-live="polite">
        {toast ? "" : ""}
      </span>
    </div>
  );
}

function FixtureFormDrawer({
  state,
  onClose,
  onSaved,
  onCancelled,
}: {
  state: DrawerState;
  onClose: () => void;
  onSaved: () => void;
  onCancelled: () => void;
}) {
  const t = useTranslations("events");
  const toast = useToast();
  const isEdit = state.open && state.mode === "edit";
  const editing = state.open && state.mode === "edit" ? state.fixture : null;

  const [opponentAr, setOpponentAr] = useState("");
  const [opponentEn, setOpponentEn] = useState("");
  const [kickoff, setKickoff] = useState("");
  const [venue, setVenue] = useState("");
  const [sportType, setSportType] = useState("football");
  const [status, setStatus] = useState<FixtureStatus>("scheduled");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const drawerKey = !state.open
    ? "closed"
    : state.mode === "create"
      ? "create"
      : `edit:${state.fixture.id}`;

  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "create") {
      setOpponentAr("");
      setOpponentEn("");
      setKickoff(defaultFutureDate());
      setVenue("");
      setSportType("football");
      setStatus("scheduled");
      setHomeScore("");
      setAwayScore("");
    } else {
      setOpponentAr(state.fixture.opponent_ar);
      setOpponentEn(state.fixture.opponent_en);
      // datetime-local needs "YYYY-MM-DDTHH:MM"
      const d = new Date(state.fixture.kickoff_at);
      setKickoff(toLocalInputValue(d));
      setVenue(state.fixture.venue ?? "");
      setStatus(state.fixture.status);
      setHomeScore(state.fixture.home_score != null ? String(state.fixture.home_score) : "");
      setAwayScore(state.fixture.away_score != null ? String(state.fixture.away_score) : "");
    }
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerKey]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const kickoffIso = new Date(kickoff).toISOString();
    const payload = {
      opponent_ar: opponentAr.trim(),
      opponent_en: opponentEn.trim(),
      kickoff_at: kickoffIso,
      venue,
      sport_type: sportType,
      status,
    };
    const res = isEdit && editing
      ? await updateFixture({
          id: editing.id,
          ...payload,
          home_score: homeScore === "" ? undefined : Number(homeScore),
          away_score: awayScore === "" ? undefined : Number(awayScore),
        })
      : await createFixture(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({
        tone: "success",
        title: isEdit ? t("toast.fixtureUpdated") : t("toast.fixtureCreated"),
      });
      onSaved();
    } else {
      setErr(t("fixtures.errors.invalid"));
      toast.push({ tone: "error", title: t("toast.saveFailed") });
    }
  }

  async function onCancelFixture() {
    if (!editing) return;
    const res = await archiveFixture({ id: editing.id });
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.fixtureCancelled") });
      onCancelled();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={isEdit ? t("fixtures.form.editTitle") : t("fixtures.form.createTitle")}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("fixtures.form.opponentAr")} required>
            <Input value={opponentAr} onChange={(e) => setOpponentAr(e.target.value)} dir="rtl" required />
          </FormGroup>
          <FormGroup label={t("fixtures.form.opponentEn")} required>
            <Input value={opponentEn} onChange={(e) => setOpponentEn(e.target.value)} dir="ltr" required />
          </FormGroup>
        </div>
        <FormGroup label={t("fixtures.form.kickoffAt")} required>
          <Input
            type="datetime-local"
            value={kickoff}
            onChange={(e) => setKickoff(e.target.value)}
            dir="ltr"
            required
          />
        </FormGroup>
        <FormGroup label={t("fixtures.form.venue")}>
          <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
        </FormGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("fixtures.form.sportType")}>
            <Input value={sportType} onChange={(e) => setSportType(e.target.value)} dir="ltr" />
          </FormGroup>
          <FormGroup label={t("fixtures.form.status")}>
            <Select value={status} onChange={(e) => setStatus(e.target.value as FixtureStatus)}>
              <option value="scheduled">{t("fixtures.statuses.scheduled")}</option>
              <option value="in_progress">{t("fixtures.statuses.in_progress")}</option>
              <option value="completed">{t("fixtures.statuses.completed")}</option>
              <option value="cancelled">{t("fixtures.statuses.cancelled")}</option>
            </Select>
          </FormGroup>
        </div>
        {isEdit && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup label={t("fixtures.form.homeScore")}>
              <Input
                type="number"
                min={0}
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                dir="ltr"
              />
            </FormGroup>
            <FormGroup label={t("fixtures.form.awayScore")}>
              <Input
                type="number"
                min={0}
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                dir="ltr"
              />
            </FormGroup>
          </div>
        )}

        {err && <p className="text-sm text-spo-danger">{err}</p>}

        <div className="flex items-center justify-between gap-2 pt-2">
          {isEdit && (
            <button
              type="button"
              onClick={onCancelFixture}
              className="text-sm text-spo-danger hover:underline"
              disabled={submitting}
            >
              {t("fixtures.statuses.cancelled")}
            </button>
          )}
          <div className="ms-auto flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {isEdit ? t("common.save") : t("common.create")}
            </Button>
          </div>
        </div>
      </form>
    </Drawer>
  );
}

function defaultFutureDate(): string {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60_000);
  d.setUTCMinutes(0, 0, 0);
  return toLocalInputValue(d);
}

function toLocalInputValue(d: Date): string {
  // datetime-local expects local time without timezone suffix.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
