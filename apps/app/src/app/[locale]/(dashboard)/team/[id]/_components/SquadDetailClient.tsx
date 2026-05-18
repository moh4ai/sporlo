"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { canPerform, type Principal } from "@sporlo/auth";
import {
  Button,
  Card,
  ConfirmModal,
  Drawer,
  EmptyTableRow,
  FormGroup,
  Input,
  Modal,
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
  addRosterEntry,
  cancelTrainingPlan,
  createTrainingPlan,
  removeRosterEntry,
  updateRosterEntry,
} from "../../actions";

export type PreviousClub = { club: string; years: string };

export type PlayerRow = {
  id: string;
  full_name_ar: string;
  full_name_en: string | null;
  jersey_number: number | null;
  position: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  bio_ar: string | null;
  bio_en: string | null;
  nationality_flag: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  instagram_handle: string | null;
  joined_club_at: string | null;
  previous_clubs: PreviousClub[];
};

export type TrainingRow = {
  id: string;
  title_ar: string;
  title_en: string;
  scheduled_at: string;
  duration_minutes: number;
  facility_name: string | null;
  cancelled_at: string | null;
};

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; player: PlayerRow };

export function SquadDetailClient({
  squadId,
  players,
  trainings,
  principal,
  locale,
}: {
  squadId: string;
  players: PlayerRow[];
  trainings: TrainingRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("team");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canUpdate = canPerform(principal, "update", "team");

  const [drawer, setDrawer] = useState<DrawerState>({ open: false });
  const [training, setTraining] = useState(false);
  const [removing, setRemoving] = useState<PlayerRow | null>(null);
  const [cancellingTraining, setCancellingTraining] = useState<TrainingRow | null>(null);

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const dobFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-spo-ink">{t("roster.title")}</h3>
          {canUpdate && (
            <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
              {t("roster.addPlayer")}
            </Button>
          )}
        </div>
        <Table>
          <THead>
            <TR>
              <TH>{t("roster.headers.name")}</TH>
              <TH>{t("roster.headers.jersey")}</TH>
              <TH>{t("roster.headers.position")}</TH>
              <TH>{t("roster.headers.nationality")}</TH>
              <TH>{t("roster.headers.dob")}</TH>
              <TH>{t("roster.headers.actions")}</TH>
            </TR>
          </THead>
          <TBody>
            {players.length === 0 ? (
              <EmptyTableRow colSpan={6}>{t("roster.empty")}</EmptyTableRow>
            ) : (
              players.map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium">
                    {locale === "ar" ? p.full_name_ar : p.full_name_en || p.full_name_ar}
                  </TD>
                  <TD>
                    {p.jersey_number != null ? (
                      <code className="rounded bg-spo-paper px-1.5 py-0.5 text-xs">
                        {p.jersey_number}
                      </code>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD>{p.position ?? "—"}</TD>
                  <TD>{p.nationality ?? "—"}</TD>
                  <TD className="text-xs text-spo-muted">
                    {p.date_of_birth ? dobFmt.format(new Date(p.date_of_birth)) : "—"}
                  </TD>
                  <TD className="space-x-2 rtl:space-x-reverse">
                    {canUpdate && (
                      <>
                        <button
                          type="button"
                          onClick={() => setDrawer({ open: true, mode: "edit", player: p })}
                          className="text-sm text-spo-green-deep hover:underline"
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemoving(p)}
                          className="text-sm text-spo-danger hover:underline"
                        >
                          {t("common.remove")}
                        </button>
                      </>
                    )}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-spo-ink">{t("training.title")}</h3>
          {canUpdate && (
            <Button onClick={() => setTraining(true)} variant="secondary">
              {t("training.newSession")}
            </Button>
          )}
        </div>
        <Table>
          <THead>
            <TR>
              <TH>{t("training.headers.scheduled")}</TH>
              <TH>{t("training.headers.title")}</TH>
              <TH>{t("training.headers.duration")}</TH>
              <TH>{t("training.headers.facility")}</TH>
              <TH>{t("training.headers.actions")}</TH>
            </TR>
          </THead>
          <TBody>
            {trainings.length === 0 ? (
              <EmptyTableRow colSpan={5}>{t("training.empty")}</EmptyTableRow>
            ) : (
              trainings.map((s) => (
                <TR key={s.id}>
                  <TD className="text-xs text-spo-muted">
                    {dateFmt.format(new Date(s.scheduled_at))}
                  </TD>
                  <TD className="font-medium">
                    {locale === "ar" ? s.title_ar : s.title_en}
                    {s.cancelled_at && (
                      <span className="ms-2 text-xs text-spo-muted">— cancelled</span>
                    )}
                  </TD>
                  <TD>{s.duration_minutes} m</TD>
                  <TD>{s.facility_name ?? "—"}</TD>
                  <TD>
                    {!s.cancelled_at && canUpdate && (
                      <button
                        type="button"
                        onClick={() => setCancellingTraining(s)}
                        className="text-sm text-spo-danger hover:underline"
                      >
                        {t("common.cancel")}
                      </button>
                    )}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      <RosterFormDrawer
        squadId={squadId}
        state={drawer}
        onClose={() => setDrawer({ open: false })}
        onSaved={() => {
          setDrawer({ open: false });
          refresh();
        }}
      />

      {training && (
        <TrainingFormModal
          squadId={squadId}
          onClose={() => setTraining(false)}
          onDone={() => {
            setTraining(false);
            refresh();
          }}
        />
      )}

      <ConfirmModal
        open={!!removing}
        title={t("common.remove")}
        description={removing?.full_name_en ?? removing?.full_name_ar ?? ""}
        confirmLabel={t("common.remove")}
        cancelLabel={t("common.cancel")}
        intent="danger"
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          const res = await removeRosterEntry({ id: removing.id });
          if (res.ok) {
            toast.push({ tone: "success", title: t("toast.playerRemoved") });
            setRemoving(null);
            refresh();
          } else {
            toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
          }
        }}
      />

      <ConfirmModal
        open={!!cancellingTraining}
        title={t("common.cancel")}
        description=""
        confirmLabel={t("common.cancel")}
        cancelLabel={t("common.cancel")}
        intent="danger"
        onCancel={() => setCancellingTraining(null)}
        onConfirm={async () => {
          if (!cancellingTraining) return;
          const res = await cancelTrainingPlan({ id: cancellingTraining.id });
          if (res.ok) {
            toast.push({ tone: "success", title: t("toast.trainingCancelled") });
            setCancellingTraining(null);
            refresh();
          } else {
            toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
          }
        }}
      />
    </div>
  );
}

function RosterFormDrawer({
  squadId,
  state,
  onClose,
  onSaved,
}: {
  squadId: string;
  state: DrawerState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("team");
  const toast = useToast();
  const isEdit = state.open && state.mode === "edit";
  const editing = state.open && state.mode === "edit" ? state.player : null;

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [jersey, setJersey] = useState("");
  const [position, setPosition] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [bioAr, setBioAr] = useState("");
  const [bioEn, setBioEn] = useState("");
  const [flag, setFlag] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [instagram, setInstagram] = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [prevClubs, setPrevClubs] = useState<PreviousClub[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const key = !state.open ? "closed" : state.mode === "create" ? "create" : `edit:${state.player.id}`;
  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "create") {
      setNameAr("");
      setNameEn("");
      setJersey("");
      setPosition("");
      setDob("");
      setNationality("");
      setBioAr("");
      setBioEn("");
      setFlag("");
      setHeightCm("");
      setWeightKg("");
      setInstagram("");
      setJoinedAt("");
      setPrevClubs([]);
    } else {
      setNameAr(state.player.full_name_ar);
      setNameEn(state.player.full_name_en ?? "");
      setJersey(state.player.jersey_number != null ? String(state.player.jersey_number) : "");
      setPosition(state.player.position ?? "");
      setDob(state.player.date_of_birth ?? "");
      setNationality(state.player.nationality ?? "");
      setBioAr(state.player.bio_ar ?? "");
      setBioEn(state.player.bio_en ?? "");
      setFlag(state.player.nationality_flag ?? "");
      setHeightCm(state.player.height_cm != null ? String(state.player.height_cm) : "");
      setWeightKg(state.player.weight_kg != null ? String(state.player.weight_kg) : "");
      setInstagram(state.player.instagram_handle ?? "");
      setJoinedAt(state.player.joined_club_at ?? "");
      setPrevClubs(state.player.previous_clubs);
    }
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const payload = {
      squad_id: squadId,
      full_name_ar: nameAr.trim(),
      full_name_en: nameEn.trim(),
      jersey_number: jersey === "" ? undefined : Number(jersey),
      position,
      date_of_birth: dob,
      nationality,
      bio_ar: bioAr,
      bio_en: bioEn,
      nationality_flag: flag,
      height_cm: heightCm === "" ? undefined : Number(heightCm),
      weight_kg: weightKg === "" ? undefined : Number(weightKg),
      instagram_handle: instagram,
      joined_club_at: joinedAt,
      previous_clubs: prevClubs,
    };
    const res = isEdit && editing
      ? await updateRosterEntry({ id: editing.id, ...payload })
      : await addRosterEntry(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({
        tone: "success",
        title: isEdit ? t("toast.playerUpdated") : t("toast.playerAdded"),
      });
      onSaved();
    } else {
      if (res.error === "jersey-taken") setErr(t("roster.errors.jerseyTaken"));
      else setErr(res.error);
      toast.push({ tone: "error", title: t("toast.saveFailed") });
    }
  }

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={isEdit ? t("roster.form.editTitle") : t("roster.form.createTitle")}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("roster.form.fullNameAr")} required>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" required />
          </FormGroup>
          <FormGroup label={t("roster.form.fullNameEn")}>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("roster.form.jerseyNumber")}>
            <Input
              type="number"
              min={1}
              max={999}
              value={jersey}
              onChange={(e) => setJersey(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
          <FormGroup label={t("roster.form.position")}>
            <Input value={position} onChange={(e) => setPosition(e.target.value)} />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("roster.form.dateOfBirth")}>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} dir="ltr" />
          </FormGroup>
          <FormGroup label={t("roster.form.nationality")}>
            <Input value={nationality} onChange={(e) => setNationality(e.target.value)} />
          </FormGroup>
        </div>

        <details className="rounded-card border border-spo-line">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-spo-ink">
            {t("roster.form.profileDetails")}
          </summary>
          <div className="space-y-3 border-t border-spo-line p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormGroup label={t("roster.form.bioAr")}>
                <Textarea
                  rows={3}
                  value={bioAr}
                  onChange={(e) => setBioAr(e.target.value)}
                  dir="rtl"
                />
              </FormGroup>
              <FormGroup label={t("roster.form.bioEn")}>
                <Textarea
                  rows={3}
                  value={bioEn}
                  onChange={(e) => setBioEn(e.target.value)}
                  dir="ltr"
                />
              </FormGroup>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <FormGroup
                label={t("roster.form.heightCm")}
                hint={t("roster.form.heightHint")}
              >
                <Input
                  type="number"
                  min={100}
                  max={250}
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  dir="ltr"
                />
              </FormGroup>
              <FormGroup
                label={t("roster.form.weightKg")}
                hint={t("roster.form.weightHint")}
              >
                <Input
                  type="number"
                  min={30}
                  max={250}
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  dir="ltr"
                />
              </FormGroup>
              <FormGroup
                label={t("roster.form.nationalityFlag")}
                hint={t("roster.form.nationalityFlagHint")}
              >
                <Input
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  dir="ltr"
                  placeholder="🇸🇦"
                />
              </FormGroup>
              <FormGroup label={t("roster.form.joinedClubAt")}>
                <Input
                  type="date"
                  value={joinedAt}
                  onChange={(e) => setJoinedAt(e.target.value)}
                  dir="ltr"
                />
              </FormGroup>
            </div>
            <FormGroup
              label={t("roster.form.instagramHandle")}
              hint={t("roster.form.instagramHint")}
            >
              <Input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                dir="ltr"
                placeholder="@player"
              />
            </FormGroup>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-spo-ink">
                    {t("roster.form.previousClubs")}
                  </h4>
                  <p className="text-xs text-spo-muted">
                    {t("roster.form.previousClubsHint")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setPrevClubs((p) => [...p, { club: "", years: "" }])
                  }
                >
                  {t("roster.form.addPrevious")}
                </Button>
              </div>
              {prevClubs.length === 0 ? (
                <p className="rounded-card border border-dashed border-spo-line p-2 text-xs text-spo-muted">
                  {t("roster.form.previousClubsEmpty")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {prevClubs.map((c, i) => (
                    <li
                      key={i}
                      className="grid gap-2 rounded-card border border-spo-line bg-white p-2 sm:grid-cols-[2fr_1fr_auto]"
                    >
                      <Input
                        value={c.club}
                        onChange={(e) =>
                          setPrevClubs((prev) =>
                            prev.map((x, j) =>
                              j === i ? { ...x, club: e.target.value } : x,
                            ),
                          )
                        }
                        placeholder={t("roster.form.prevClubName")}
                      />
                      <Input
                        value={c.years}
                        onChange={(e) =>
                          setPrevClubs((prev) =>
                            prev.map((x, j) =>
                              j === i ? { ...x, years: e.target.value } : x,
                            ),
                          )
                        }
                        dir="ltr"
                        placeholder="2018–2022"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPrevClubs((prev) => prev.filter((_, j) => j !== i))
                        }
                        className="text-xs text-spo-muted hover:text-spo-danger"
                      >
                        {t("common.remove")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </details>

        {err && <p className="text-sm text-spo-danger">{err}</p>}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {isEdit ? t("common.save") : t("common.create")}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function TrainingFormModal({
  squadId,
  onClose,
  onDone,
}: {
  squadId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("team");
  const toast = useToast();
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [when, setWhen] = useState(defaultFuture());
  const [duration, setDuration] = useState("90");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await createTrainingPlan({
      squad_id: squadId,
      title_ar: titleAr.trim(),
      title_en: titleEn.trim(),
      scheduled_at: new Date(when).toISOString(),
      duration_minutes: Number(duration),
      notes,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.trainingAdded") });
      onDone();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("training.form.title")}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("training.form.titleAr")} required>
            <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} dir="rtl" required />
          </FormGroup>
          <FormGroup label={t("training.form.titleEn")} required>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} dir="ltr" required />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("training.form.scheduledAt")} required>
            <Input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
          <FormGroup label={t("training.form.durationMinutes")} required>
            <Input
              type="number"
              min={15}
              max={600}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
        </div>
        <FormGroup label={t("training.form.notes")}>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormGroup>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {t("training.newSession")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function defaultFuture(): string {
  const d = new Date(Date.now() + 24 * 60 * 60_000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
