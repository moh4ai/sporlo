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
  Select,
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

import { archiveStaff, createStaff, updateStaff } from "../actions";

export type StaffRow = {
  id: string;
  full_name_ar: string;
  full_name_en: string | null;
  job_title_ar: string | null;
  job_title_en: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  manager_id: string | null;
  hire_date: string | null;
  bio: string | null;
  active: boolean;
};

const DEPARTMENTS = [
  "finance",
  "hr",
  "marketing",
  "sports",
  "legal",
  "it",
  "academy",
  "events",
  "csr",
  "governance",
] as const;

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; staff: StaffRow };

export function DirectoryClient({
  staff,
  principal,
  locale,
}: {
  staff: StaffRow[];
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

  function name(s: StaffRow) {
    return locale === "ar" ? s.full_name_ar : s.full_name_en ?? s.full_name_ar;
  }

  function title(s: StaffRow) {
    return locale === "ar" ? s.job_title_ar : s.job_title_en ?? s.job_title_ar ?? null;
  }

  function managerName(id: string | null): string {
    if (!id) return "—";
    const m = staff.find((s) => s.id === id);
    return m ? name(m) : "—";
  }

  async function archive(s: StaffRow) {
    const res = await archiveStaff({ id: s.id });
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.staffArchived") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("directory.title")}</h2>
          <p className="text-sm text-spo-muted">{t("directory.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
            {t("directory.newStaff")}
          </Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("directory.headers.name")}</TH>
            <TH>{t("directory.headers.title")}</TH>
            <TH>{t("directory.headers.department")}</TH>
            <TH>{t("directory.headers.manager")}</TH>
            <TH>{t("directory.headers.status")}</TH>
            <TH>{t("directory.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {staff.length === 0 ? (
            <EmptyTableRow colSpan={6}>{t("directory.empty")}</EmptyTableRow>
          ) : (
            staff.map((s) => (
              <TR key={s.id}>
                <TD className="font-medium">{name(s)}</TD>
                <TD>{title(s) ?? "—"}</TD>
                <TD>{s.department ?? "—"}</TD>
                <TD>{managerName(s.manager_id)}</TD>
                <TD>
                  {s.active ? (
                    <Badge tone="green">{t("common.active")}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("common.archived")}</Badge>
                  )}
                </TD>
                <TD className="space-x-2 rtl:space-x-reverse">
                  {canUpdate && (
                    <button
                      type="button"
                      onClick={() => setDrawer({ open: true, mode: "edit", staff: s })}
                      className="text-sm text-spo-green-deep hover:underline"
                    >
                      {t("common.edit")}
                    </button>
                  )}
                  {canDelete && s.active && (
                    <button
                      type="button"
                      onClick={() => archive(s)}
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

      <StaffFormDrawer
        state={drawer}
        allStaff={staff}
        onClose={() => setDrawer({ open: false })}
        onSaved={() => {
          setDrawer({ open: false });
          startTransition(() => router.refresh());
        }}
        locale={locale}
      />
    </div>
  );
}

function StaffFormDrawer({
  state,
  allStaff,
  onClose,
  onSaved,
  locale,
}: {
  state: DrawerState;
  allStaff: StaffRow[];
  onClose: () => void;
  onSaved: () => void;
  locale: "ar" | "en";
}) {
  const t = useTranslations("hr");
  const toast = useToast();
  const isEdit = state.open && state.mode === "edit";
  const editing = state.open && state.mode === "edit" ? state.staff : null;

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [managerId, setManagerId] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [bio, setBio] = useState("");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const key = !state.open ? "closed" : state.mode === "create" ? "create" : `edit:${state.staff.id}`;
  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "create") {
      setNameAr("");
      setNameEn("");
      setTitleAr("");
      setTitleEn("");
      setDepartment("");
      setEmail("");
      setPhone("");
      setManagerId("");
      setHireDate("");
      setBio("");
      setActive(true);
    } else {
      setNameAr(state.staff.full_name_ar);
      setNameEn(state.staff.full_name_en ?? "");
      setTitleAr(state.staff.job_title_ar ?? "");
      setTitleEn(state.staff.job_title_en ?? "");
      setDepartment(state.staff.department ?? "");
      setEmail(state.staff.email ?? "");
      setPhone(state.staff.phone ?? "");
      setManagerId(state.staff.manager_id ?? "");
      setHireDate(state.staff.hire_date ?? "");
      setBio(state.staff.bio ?? "");
      setActive(state.staff.active);
    }
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const payload = {
      full_name_ar: nameAr.trim(),
      full_name_en: nameEn,
      job_title_ar: titleAr,
      job_title_en: titleEn,
      department,
      email,
      phone,
      manager_id: managerId,
      hire_date: hireDate,
      bio,
      active,
    };
    const res = isEdit && editing
      ? await updateStaff({ id: editing.id, ...payload })
      : await createStaff(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({
        tone: "success",
        title: isEdit ? t("toast.staffUpdated") : t("toast.staffAdded"),
      });
      onSaved();
    } else {
      if (res.field === "manager_id") setErr(t("directory.errors.selfManager"));
      else setErr(res.error);
      toast.push({ tone: "error", title: t("toast.saveFailed") });
    }
  }

  const managerOptions = allStaff.filter(
    (s) => s.active && (!editing || s.id !== editing.id),
  );

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={isEdit ? t("directory.form.editTitle") : t("directory.form.createTitle")}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("directory.form.fullNameAr")} required>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" required />
          </FormGroup>
          <FormGroup label={t("directory.form.fullNameEn")}>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("directory.form.titleAr")}>
            <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} dir="rtl" />
          </FormGroup>
          <FormGroup label={t("directory.form.titleEn")}>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} dir="ltr" />
          </FormGroup>
        </div>
        <FormGroup label={t("directory.form.department")}>
          <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">{t("directory.form.departmentNone")}</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </FormGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("directory.form.email")}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
          </FormGroup>
          <FormGroup label={t("directory.form.phone")}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
          </FormGroup>
        </div>
        <FormGroup label={t("directory.form.manager")}>
          <Select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">{t("directory.form.managerNone")}</option>
            {managerOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {locale === "ar" ? m.full_name_ar : m.full_name_en ?? m.full_name_ar}
              </option>
            ))}
          </Select>
        </FormGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("directory.form.hireDate")}>
            <Input
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
        </div>
        <FormGroup label={t("directory.form.bio")}>
          <Textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} />
        </FormGroup>
        <Switch checked={active} onChange={setActive} label={t("common.active")} />
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
