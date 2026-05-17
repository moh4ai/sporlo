"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { canPerform, type Principal } from "@sporlo/auth";
import {
  Badge,
  Button,
  Drawer,
  EmptyTableRow,
  FormGroup,
  Input,
  Switch,
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

import { archiveCoach, createCoach, updateCoach } from "../../actions";

export type CoachRow = {
  id: string;
  full_name_ar: string;
  full_name_en: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  active: boolean;
};

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; coach: CoachRow };

export function CoachesClient({
  coaches,
  principal,
  locale,
}: {
  coaches: CoachRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("academy");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canCreate = useMemo(() => canPerform(principal, "create", "academy"), [principal]);
  const canUpdate = useMemo(() => canPerform(principal, "update", "academy"), [principal]);
  const canDelete = useMemo(() => canPerform(principal, "delete", "academy"), [principal]);
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });

  async function archive(c: CoachRow) {
    const res = await archiveCoach({ id: c.id });
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.coachArchived") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("coaches.title")}</h2>
          <p className="text-sm text-spo-muted">{t("coaches.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
            {t("coaches.newCoach")}
          </Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("coaches.headers.name")}</TH>
            <TH>{t("coaches.headers.email")}</TH>
            <TH>{t("coaches.headers.phone")}</TH>
            <TH>{t("coaches.headers.status")}</TH>
            <TH>{t("coaches.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {coaches.length === 0 ? (
            <EmptyTableRow colSpan={5}>{t("coaches.empty")}</EmptyTableRow>
          ) : (
            coaches.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium">
                  {locale === "ar" ? c.full_name_ar : c.full_name_en ?? c.full_name_ar}
                </TD>
                <TD dir="ltr">{c.email ?? "—"}</TD>
                <TD dir="ltr">{c.phone ?? "—"}</TD>
                <TD>
                  {c.active ? (
                    <Badge tone="green">{t("common.active")}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("common.archived")}</Badge>
                  )}
                </TD>
                <TD className="space-x-2 rtl:space-x-reverse">
                  {canUpdate && (
                    <button
                      type="button"
                      onClick={() => setDrawer({ open: true, mode: "edit", coach: c })}
                      className="text-sm text-spo-green-deep hover:underline"
                    >
                      {t("common.edit")}
                    </button>
                  )}
                  {canDelete && c.active && (
                    <button
                      type="button"
                      onClick={() => archive(c)}
                      className="text-sm text-spo-muted hover:text-spo-ink-2"
                    >
                      {t("common.archive")}
                    </button>
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <CoachFormDrawer
        state={drawer}
        onClose={() => setDrawer({ open: false })}
        onSaved={() => {
          setDrawer({ open: false });
          startTransition(() => router.refresh());
        }}
      />
    </div>
  );
}

function CoachFormDrawer({
  state,
  onClose,
  onSaved,
}: {
  state: DrawerState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("academy");
  const toast = useToast();
  const isEdit = state.open && state.mode === "edit";
  const editing = state.open && state.mode === "edit" ? state.coach : null;

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const key = !state.open ? "closed" : state.mode === "create" ? "create" : `edit:${state.coach.id}`;
  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "create") {
      setNameAr("");
      setNameEn("");
      setEmail("");
      setPhone("");
      setBio("");
      setActive(true);
    } else {
      setNameAr(state.coach.full_name_ar);
      setNameEn(state.coach.full_name_en ?? "");
      setEmail(state.coach.email ?? "");
      setPhone(state.coach.phone ?? "");
      setBio(state.coach.bio ?? "");
      setActive(state.coach.active);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      full_name_ar: nameAr.trim(),
      full_name_en: nameEn,
      email,
      phone,
      bio,
      active,
    };
    const res = isEdit && editing
      ? await updateCoach({ id: editing.id, ...payload })
      : await createCoach(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({
        tone: "success",
        title: isEdit ? t("toast.coachUpdated") : t("toast.coachCreated"),
      });
      onSaved();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={isEdit ? t("coaches.form.editTitle") : t("coaches.form.createTitle")}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("coaches.form.fullNameAr")} required>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" required />
          </FormGroup>
          <FormGroup label={t("coaches.form.fullNameEn")}>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("coaches.form.email")}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
          </FormGroup>
          <FormGroup label={t("coaches.form.phone")}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
          </FormGroup>
        </div>
        <FormGroup label={t("coaches.form.bio")}>
          <Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </FormGroup>
        <Switch checked={active} onChange={setActive} label={t("common.active")} />
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
