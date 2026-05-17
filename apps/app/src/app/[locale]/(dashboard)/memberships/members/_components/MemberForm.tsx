"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import {
  Button,
  Card,
  DatePicker,
  FormGroup,
  Input,
  Select,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import { createMember, updateMember } from "../../actions";

export interface MemberFormInitial {
  id?: string;
  full_name_ar: string;
  full_name_en: string;
  email: string;
  phone: string;
  national_id: string;
  date_of_birth: string;
  status: "active" | "inactive" | "prospect";
}

const DEFAULT_INITIAL: MemberFormInitial = {
  full_name_ar: "",
  full_name_en: "",
  email: "",
  phone: "",
  national_id: "",
  date_of_birth: "",
  status: "active",
};

export function MemberForm({
  initial,
  mode,
}: {
  initial?: MemberFormInitial;
  mode: "create" | "edit";
}) {
  const t = useTranslations("memberships");
  const router = useRouter();
  const toast = useToast();
  const start = initial ?? DEFAULT_INITIAL;

  const [fullNameAr, setFullNameAr] = useState(start.full_name_ar);
  const [fullNameEn, setFullNameEn] = useState(start.full_name_en);
  const [email, setEmail] = useState(start.email);
  const [phone, setPhone] = useState(start.phone);
  const [nationalId, setNationalId] = useState(start.national_id);
  const [dob, setDob] = useState(start.date_of_birth);
  const [status, setStatus] = useState<MemberFormInitial["status"]>(start.status);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      full_name_ar: fullNameAr.trim(),
      full_name_en: fullNameEn.trim(),
      email: email.trim(),
      phone: phone.trim(),
      national_id: nationalId.trim(),
      date_of_birth: dob,
      status,
    };

    if (mode === "edit" && initial?.id) {
      const res = await updateMember({ id: initial.id, ...payload });
      setSubmitting(false);
      if (res.ok) {
        toast.push({ tone: "success", title: t("toast.memberUpdated") });
        router.refresh();
        return;
      }
      handleError(res);
      return;
    }

    const res = await createMember(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.memberCreated") });
      router.replace(`/memberships/members/${res.data.id}`);
      return;
    }
    handleError(res);

    function handleError(failed: { error: string; field?: string }) {
      if (failed.field === "national_id") setErrorMsg(t("members.errors.nationalIdInvalid"));
      else if (failed.field === "phone") setErrorMsg(t("members.errors.phoneInvalid"));
      else setErrorMsg(t("members.errors.invalid"));
      toast.push({ tone: "error", title: t("toast.saveFailed") });
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("members.form.fullNameAr")} required>
            <Input
              value={fullNameAr}
              onChange={(e) => setFullNameAr(e.target.value)}
              required
              dir="rtl"
            />
          </FormGroup>
          <FormGroup label={t("members.form.fullNameEn")}>
            <Input
              value={fullNameEn}
              onChange={(e) => setFullNameEn(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("members.form.email")}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
          <FormGroup
            label={t("members.form.phone")}
            hint={t("members.form.phoneHint")}
          >
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup
            label={t("members.form.nationalId")}
            hint={t("members.form.nationalIdHint")}
          >
            <Input
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
              maxLength={10}
              dir="ltr"
            />
          </FormGroup>
          <FormGroup label={t("members.form.dateOfBirth")}>
            <DatePicker value={dob} onChange={(e) => setDob(e.target.value)} />
          </FormGroup>
        </div>

        <FormGroup label={t("members.form.status")}>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="active">{t("members.statuses.active")}</option>
            <option value="inactive">{t("members.statuses.inactive")}</option>
            <option value="prospect">{t("members.statuses.prospect")}</option>
          </Select>
        </FormGroup>

        {errorMsg && <p className="text-sm text-spo-danger">{errorMsg}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={submitting}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {mode === "edit" ? t("common.save") : t("common.create")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
