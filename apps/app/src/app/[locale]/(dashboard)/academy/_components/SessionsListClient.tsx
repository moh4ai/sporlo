"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
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

import { Link, useRouter } from "@/i18n/navigation";

import { createAcademySession } from "../actions";

export type SessionRow = {
  id: string;
  title_ar: string;
  title_en: string;
  scheduled_at: string;
  duration_minutes: number;
  age_group: string | null;
  coach_name: string | null;
  cancelled_at: string | null;
};

export type CoachOption = {
  id: string;
  label: string;
};

export type FacilityOption = {
  id: string;
  label: string;
};

export function SessionsListClient({
  sessions,
  coaches,
  facilities,
  principal,
  locale,
}: {
  sessions: SessionRow[];
  coaches: CoachOption[];
  facilities: FacilityOption[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("academy");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canCreate = useMemo(() => canPerform(principal, "update", "academy"), [principal]);
  const [open, setOpen] = useState(false);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("sessions.title")}</h2>
          <p className="text-sm text-spo-muted">{t("sessions.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setOpen(true)}>{t("sessions.newSession")}</Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("sessions.headers.scheduled")}</TH>
            <TH>{t("sessions.headers.title")}</TH>
            <TH>{t("sessions.headers.coach")}</TH>
            <TH>{t("sessions.headers.duration")}</TH>
            <TH>{t("sessions.headers.ageGroup")}</TH>
            <TH>{t("sessions.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {sessions.length === 0 ? (
            <EmptyTableRow colSpan={6}>{t("sessions.empty")}</EmptyTableRow>
          ) : (
            sessions.map((s) => (
              <TR key={s.id}>
                <TD className="text-xs text-spo-muted">
                  {dateFmt.format(new Date(s.scheduled_at))}
                </TD>
                <TD className="font-medium">
                  <Link href={`/academy/${s.id}`} className="text-spo-green-deep hover:underline">
                    {locale === "ar" ? s.title_ar : s.title_en}
                  </Link>
                  {s.cancelled_at && (
                    <Badge tone="neutral" className="ms-2">cancelled</Badge>
                  )}
                </TD>
                <TD>{s.coach_name ?? "—"}</TD>
                <TD>{s.duration_minutes} m</TD>
                <TD>{s.age_group ?? "—"}</TD>
                <TD>
                  <Link href={`/academy/${s.id}`} className="text-sm text-spo-green-deep hover:underline">
                    {t("common.edit")}
                  </Link>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {open && (
        <SessionFormModal
          coaches={coaches}
          facilities={facilities}
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

function SessionFormModal({
  coaches,
  facilities,
  onClose,
  onDone,
}: {
  coaches: CoachOption[];
  facilities: FacilityOption[];
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("academy");
  const toast = useToast();
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [when, setWhen] = useState(defaultFuture());
  const [duration, setDuration] = useState("60");
  const [coachId, setCoachId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setWhen(defaultFuture());
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await createAcademySession({
      title_ar: titleAr.trim(),
      title_en: titleEn.trim(),
      scheduled_at: new Date(when).toISOString(),
      duration_minutes: Number(duration),
      coach_id: coachId,
      facility_id: facilityId,
      age_group: ageGroup,
      notes,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.sessionCreated") });
      onDone();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("sessions.form.title")}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("sessions.form.titleAr")} required>
            <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} dir="rtl" required />
          </FormGroup>
          <FormGroup label={t("sessions.form.titleEn")} required>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} dir="ltr" required />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("sessions.form.scheduledAt")} required>
            <Input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
          <FormGroup label={t("sessions.form.durationMinutes")} required>
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
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("sessions.form.coach")}>
            <Select value={coachId} onChange={(e) => setCoachId(e.target.value)}>
              <option value="">{t("sessions.form.noneCoach")}</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </FormGroup>
          <FormGroup label={t("sessions.form.facility")}>
            <Select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
              <option value="">{t("sessions.form.noneFacility")}</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </Select>
          </FormGroup>
        </div>
        <FormGroup label={t("sessions.form.ageGroup")}>
          <Input value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} dir="ltr" />
        </FormGroup>
        <FormGroup label={t("sessions.form.notes")}>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormGroup>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {t("sessions.newSession")}
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
