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

import { Link, useRouter } from "@/i18n/navigation";

import {
  archiveFacility,
  createFacility,
  updateFacility,
} from "../actions";

export type FacilityRow = {
  id: string;
  name_ar: string;
  name_en: string;
  facility_type: string | null;
  capacity: number | null;
  hourly_rate_sar: number | null;
  member_hourly_rate_sar: number | null;
  notes: string | null;
  active: boolean;
};

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; facility: FacilityRow };

export function FacilitiesListClient({
  facilities,
  principal,
  locale,
}: {
  facilities: FacilityRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("facilities");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canCreate = useMemo(() => canPerform(principal, "create", "facilities"), [principal]);
  const canUpdate = useMemo(() => canPerform(principal, "update", "facilities"), [principal]);

  const [drawer, setDrawer] = useState<DrawerState>({ open: false });

  const sarFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        style: "currency",
        currency: "SAR",
      }),
    [locale],
  );

  async function archive(f: FacilityRow) {
    const res = await archiveFacility({ id: f.id });
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.facilityArchived") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("list.title")}</h2>
          <p className="text-sm text-spo-muted">{t("list.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
            {t("list.newFacility")}
          </Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("list.headers.name")}</TH>
            <TH>{t("list.headers.type")}</TH>
            <TH>{t("list.headers.capacity")}</TH>
            <TH>{t("list.headers.rate")}</TH>
            <TH>{t("list.headers.status")}</TH>
            <TH>{t("list.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {facilities.length === 0 ? (
            <EmptyTableRow colSpan={6}>{t("list.empty")}</EmptyTableRow>
          ) : (
            facilities.map((f) => (
              <TR key={f.id}>
                <TD className="font-medium">
                  <Link
                    href={`/facilities/${f.id}`}
                    className="text-spo-green-deep hover:underline"
                  >
                    {locale === "ar" ? f.name_ar : f.name_en}
                  </Link>
                </TD>
                <TD>{f.facility_type ?? "—"}</TD>
                <TD>{f.capacity ?? "—"}</TD>
                <TD>{f.hourly_rate_sar != null ? sarFmt.format(f.hourly_rate_sar) : "—"}</TD>
                <TD>
                  {f.active ? (
                    <Badge tone="green">{t("common.active")}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("common.archived")}</Badge>
                  )}
                </TD>
                <TD className="space-x-2 rtl:space-x-reverse">
                  {canUpdate && (
                    <>
                      <button
                        type="button"
                        onClick={() => setDrawer({ open: true, mode: "edit", facility: f })}
                        className="text-sm text-spo-green-deep hover:underline"
                      >
                        {t("common.edit")}
                      </button>
                      {f.active && (
                        <button
                          type="button"
                          onClick={() => archive(f)}
                          className="text-sm text-spo-muted hover:text-spo-ink-2"
                        >
                          {t("common.archive")}
                        </button>
                      )}
                    </>
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <FacilityFormDrawer
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

function FacilityFormDrawer({
  state,
  onClose,
  onSaved,
}: {
  state: DrawerState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("facilities");
  const toast = useToast();
  const isEdit = state.open && state.mode === "edit";
  const editing = state.open && state.mode === "edit" ? state.facility : null;

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [ftype, setFtype] = useState("");
  const [capacity, setCapacity] = useState("");
  const [rate, setRate] = useState("");
  const [memberRate, setMemberRate] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const key = !state.open ? "closed" : state.mode === "create" ? "create" : `edit:${state.facility.id}`;
  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "create") {
      setNameAr("");
      setNameEn("");
      setFtype("");
      setCapacity("");
      setRate("");
      setMemberRate("");
      setNotes("");
      setActive(true);
    } else {
      setNameAr(state.facility.name_ar);
      setNameEn(state.facility.name_en);
      setFtype(state.facility.facility_type ?? "");
      setCapacity(state.facility.capacity != null ? String(state.facility.capacity) : "");
      setRate(state.facility.hourly_rate_sar != null ? String(state.facility.hourly_rate_sar) : "");
      setMemberRate(state.facility.member_hourly_rate_sar != null ? String(state.facility.member_hourly_rate_sar) : "");
      setNotes(state.facility.notes ?? "");
      setActive(state.facility.active);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      name_ar: nameAr.trim(),
      name_en: nameEn.trim(),
      facility_type: ftype,
      capacity: capacity === "" ? undefined : Number(capacity),
      hourly_rate_sar: rate === "" ? undefined : Number(rate),
      member_hourly_rate_sar: memberRate === "" ? undefined : Number(memberRate),
      notes,
      active,
    };
    const res = isEdit && editing
      ? await updateFacility({ id: editing.id, ...payload })
      : await createFacility(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({
        tone: "success",
        title: isEdit ? t("toast.facilityUpdated") : t("toast.facilityCreated"),
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
      title={isEdit ? t("form.editTitle") : t("form.createTitle")}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("form.nameAr")} required>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" required />
          </FormGroup>
          <FormGroup label={t("form.nameEn")} required>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" required />
          </FormGroup>
        </div>
        <FormGroup label={t("form.type")}>
          <Input value={ftype} onChange={(e) => setFtype(e.target.value)} dir="ltr" />
        </FormGroup>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormGroup label={t("form.capacity")}>
            <Input
              type="number"
              min={0}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
          <FormGroup label={t("form.rate")}>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
          <FormGroup label={t("form.memberRate")}>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={memberRate}
              onChange={(e) => setMemberRate(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
        </div>
        <FormGroup label={t("form.notes")}>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
