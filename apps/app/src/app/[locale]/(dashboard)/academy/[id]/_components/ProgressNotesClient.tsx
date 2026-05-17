"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import {
  Badge,
  Button,
  Card,
  Checkbox,
  FormGroup,
  Input,
  Modal,
  Select,
  Textarea,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import { createProgressNote, deleteProgressNote } from "../../actions";

import type { MemberOption } from "./AttendanceClient";

export type ExistingNote = {
  id: string;
  member_id: string;
  member_name: string;
  note: string;
  rating: number | null;
  parent_visible: boolean;
  created_at: string;
};

export function ProgressNotesClient({
  sessionId,
  members,
  initial,
  coachId,
  locale,
}: {
  sessionId: string;
  members: MemberOption[];
  initial: ExistingNote[];
  coachId: string | null;
  locale: "ar" | "en";
}) {
  const t = useTranslations("academy");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  async function remove(id: string) {
    const res = await deleteProgressNote({ id });
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.noteDeleted") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-spo-ink">{t("notes.title")}</h3>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {t("notes.newNote")}
        </Button>
      </div>

      {initial.length === 0 ? (
        <p className="text-sm text-spo-muted">{t("notes.noneYet")}</p>
      ) : (
        <ul className="space-y-2">
          {initial.map((n) => (
            <li key={n.id} className="rounded-md border border-spo-line bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-spo-ink">{n.member_name}</span>
                    {n.rating != null && <Badge tone="amber">★ {n.rating}/5</Badge>}
                    {!n.parent_visible && <Badge tone="neutral">internal</Badge>}
                  </div>
                  <p className="text-sm text-spo-ink-2 whitespace-pre-wrap">{n.note}</p>
                </div>
                <div className="text-end text-xs text-spo-muted">
                  <div>{dateFmt.format(new Date(n.created_at))}</div>
                  <button
                    type="button"
                    onClick={() => remove(n.id)}
                    className="text-spo-danger hover:underline"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <NoteFormModal
          sessionId={sessionId}
          coachId={coachId}
          members={members}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </Card>
  );
}

function NoteFormModal({
  sessionId,
  coachId,
  members,
  onClose,
  onDone,
}: {
  sessionId: string;
  coachId: string | null;
  members: MemberOption[];
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("academy");
  const toast = useToast();
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [noteAr, setNoteAr] = useState("");
  const [noteEn, setNoteEn] = useState("");
  const [rating, setRating] = useState("");
  const [parentVisible, setParentVisible] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await createProgressNote({
      member_id: memberId,
      coach_id: coachId ?? undefined,
      session_id: sessionId,
      note_ar: noteAr,
      note_en: noteEn,
      rating: rating === "" ? undefined : Number(rating),
      parent_visible: parentVisible,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.noteAdded") });
      onDone();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("notes.form.title")}>
      <form onSubmit={submit} className="space-y-4">
        <FormGroup label="Member" required>
          <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </Select>
        </FormGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("notes.form.noteAr")}>
            <Textarea rows={3} value={noteAr} onChange={(e) => setNoteAr(e.target.value)} dir="rtl" />
          </FormGroup>
          <FormGroup label={t("notes.form.noteEn")}>
            <Textarea rows={3} value={noteEn} onChange={(e) => setNoteEn(e.target.value)} dir="ltr" />
          </FormGroup>
        </div>
        <FormGroup label={t("notes.form.rating")}>
          <Input
            type="number"
            min={1}
            max={5}
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            dir="ltr"
          />
        </FormGroup>
        <Checkbox
          checked={parentVisible}
          onChange={(e) => setParentVisible(e.target.checked)}
          label={t("notes.form.parentVisible")}
        />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {t("notes.newNote")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
