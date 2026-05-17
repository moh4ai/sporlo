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

import { archiveJD, createJD, updateJD } from "../../actions";

export type JDRow = {
  id: string;
  title_ar: string;
  title_en: string;
  department: string | null;
  level: string | null;
  responsibilities_ar: string | null;
  responsibilities_en: string | null;
  requirements_ar: string | null;
  requirements_en: string | null;
  active: boolean;
};

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; jd: JDRow };

export function JDsClient({
  jds,
  principal,
  locale,
}: {
  jds: JDRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("hr");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canCreate = useMemo(() => canPerform(principal, "create", "hr"), [principal]);
  const canUpdate = useMemo(() => canPerform(principal, "update", "hr"), [principal]);
  const canDelete = useMemo(() => canPerform(principal, "delete", "hr"), [principal]);
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });

  async function archive(j: JDRow) {
    const res = await archiveJD({ id: j.id });
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.jdArchived") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("jds.title")}</h2>
          <p className="text-sm text-spo-muted">{t("jds.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
            {t("jds.newJD")}
          </Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("jds.headers.title")}</TH>
            <TH>{t("jds.headers.department")}</TH>
            <TH>{t("jds.headers.level")}</TH>
            <TH>{t("jds.headers.status")}</TH>
            <TH>{t("jds.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {jds.length === 0 ? (
            <EmptyTableRow colSpan={5}>{t("jds.empty")}</EmptyTableRow>
          ) : (
            jds.map((j) => (
              <TR key={j.id}>
                <TD className="font-medium">{locale === "ar" ? j.title_ar : j.title_en}</TD>
                <TD>{j.department ?? "—"}</TD>
                <TD>{j.level ?? "—"}</TD>
                <TD>
                  {j.active ? (
                    <Badge tone="green">{t("common.active")}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("common.archived")}</Badge>
                  )}
                </TD>
                <TD className="space-x-2 rtl:space-x-reverse">
                  {canUpdate && (
                    <button
                      type="button"
                      onClick={() => setDrawer({ open: true, mode: "edit", jd: j })}
                      className="text-sm text-spo-green-deep hover:underline"
                    >
                      {t("common.edit")}
                    </button>
                  )}
                  {canDelete && j.active && (
                    <button
                      type="button"
                      onClick={() => archive(j)}
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

      <JDFormDrawer
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

function JDFormDrawer({
  state,
  onClose,
  onSaved,
}: {
  state: DrawerState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("hr");
  const toast = useToast();
  const isEdit = state.open && state.mode === "edit";
  const editing = state.open && state.mode === "edit" ? state.jd : null;

  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [respAr, setRespAr] = useState("");
  const [respEn, setRespEn] = useState("");
  const [reqAr, setReqAr] = useState("");
  const [reqEn, setReqEn] = useState("");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const key = !state.open ? "closed" : state.mode === "create" ? "create" : `edit:${state.jd.id}`;
  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "create") {
      setTitleAr("");
      setTitleEn("");
      setDepartment("");
      setLevel("");
      setRespAr("");
      setRespEn("");
      setReqAr("");
      setReqEn("");
      setActive(true);
    } else {
      setTitleAr(state.jd.title_ar);
      setTitleEn(state.jd.title_en);
      setDepartment(state.jd.department ?? "");
      setLevel(state.jd.level ?? "");
      setRespAr(state.jd.responsibilities_ar ?? "");
      setRespEn(state.jd.responsibilities_en ?? "");
      setReqAr(state.jd.requirements_ar ?? "");
      setReqEn(state.jd.requirements_en ?? "");
      setActive(state.jd.active);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      title_ar: titleAr.trim(),
      title_en: titleEn.trim(),
      department,
      level,
      responsibilities_ar: respAr,
      responsibilities_en: respEn,
      requirements_ar: reqAr,
      requirements_en: reqEn,
      active,
    };
    const res = isEdit && editing
      ? await updateJD({ id: editing.id, ...payload })
      : await createJD(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({
        tone: "success",
        title: isEdit ? t("toast.jdUpdated") : t("toast.jdCreated"),
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
      title={isEdit ? t("jds.form.editTitle") : t("jds.form.createTitle")}
      widthClassName="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("jds.form.titleAr")} required>
            <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} dir="rtl" required />
          </FormGroup>
          <FormGroup label={t("jds.form.titleEn")} required>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} dir="ltr" required />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("jds.form.department")}>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
          </FormGroup>
          <FormGroup label={t("jds.form.level")}>
            <Input value={level} onChange={(e) => setLevel(e.target.value)} />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("jds.form.responsibilitiesAr")}>
            <Textarea rows={4} value={respAr} onChange={(e) => setRespAr(e.target.value)} dir="rtl" />
          </FormGroup>
          <FormGroup label={t("jds.form.responsibilitiesEn")}>
            <Textarea rows={4} value={respEn} onChange={(e) => setRespEn(e.target.value)} dir="ltr" />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("jds.form.requirementsAr")}>
            <Textarea rows={4} value={reqAr} onChange={(e) => setReqAr(e.target.value)} dir="rtl" />
          </FormGroup>
          <FormGroup label={t("jds.form.requirementsEn")}>
            <Textarea rows={4} value={reqEn} onChange={(e) => setReqEn(e.target.value)} dir="ltr" />
          </FormGroup>
        </div>
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
