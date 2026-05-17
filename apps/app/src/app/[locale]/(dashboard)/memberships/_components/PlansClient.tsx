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
  ConfirmModal,
  Drawer,
  EmptyTableRow,
  FormGroup,
  Input,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import { archivePlan, createPlan, updatePlan } from "../actions";

type PlanRow = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  duration_months: number;
  price_sar: number;
  member_only_store_discount_pct: number;
  active: boolean;
};

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; plan: PlanRow };

export function PlansClient({
  initialPlans,
  principal,
  locale,
}: {
  initialPlans: PlanRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("memberships");
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });
  const [confirming, setConfirming] = useState<{ plan: PlanRow; toArchive: boolean } | null>(null);

  const canCreate = useMemo(() => canPerform(principal, "create", "plan"), [principal]);
  const canUpdate = useMemo(() => canPerform(principal, "update", "plan"), [principal]);

  const sarFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        style: "currency",
        currency: "SAR",
        maximumFractionDigits: 2,
      }),
    [locale],
  );

  const displayName = (p: PlanRow) => (locale === "ar" ? p.name_ar : p.name_en);

  function handleArchiveClick(plan: PlanRow) {
    setConfirming({ plan, toArchive: plan.active });
  }

  async function confirmArchive() {
    if (!confirming) return;
    const res = await archivePlan({
      id: confirming.plan.id,
      archive: confirming.toArchive,
    });
    if (res.ok) {
      toast.push({
        tone: "success",
        title: confirming.toArchive
          ? t("toast.planArchived")
          : t("toast.planUnarchived"),
      });
      setConfirming(null);
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.archiveFailed"), description: res.error });
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">
            {t("plans.title")}
          </h2>
          <p className="text-sm text-spo-muted">{t("plans.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
            {t("plans.newPlan")}
          </Button>
        )}
      </div>

      <Table responsive>
        <THead>
          <TR>
            <TH>{t("plans.headers.name")}</TH>
            <TH>{t("plans.headers.code")}</TH>
            <TH>{t("plans.headers.duration")}</TH>
            <TH>{t("plans.headers.price")}</TH>
            <TH>{t("plans.headers.discount")}</TH>
            <TH>{t("plans.headers.status")}</TH>
            <TH>{t("plans.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {initialPlans.length === 0 ? (
            <EmptyTableRow colSpan={7}>{t("plans.empty")}</EmptyTableRow>
          ) : (
            initialPlans.map((plan) => (
              <TR key={plan.id}>
                <TD label={t("plans.headers.name")} className="font-medium">
                  {displayName(plan)}
                </TD>
                <TD label={t("plans.headers.code")}>
                  <code className="rounded bg-spo-paper px-1.5 py-0.5 text-xs">
                    {plan.code}
                  </code>
                </TD>
                <TD label={t("plans.headers.duration")}>{plan.duration_months}</TD>
                <TD label={t("plans.headers.price")}>
                  {sarFormatter.format(plan.price_sar)}
                </TD>
                <TD label={t("plans.headers.discount")}>
                  {plan.member_only_store_discount_pct}%
                </TD>
                <TD label={t("plans.headers.status")}>
                  {plan.active ? (
                    <Badge tone="green">{t("common.active")}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("common.archived")}</Badge>
                  )}
                </TD>
                <TD
                  label={t("plans.headers.actions")}
                  className="space-x-2 rtl:space-x-reverse"
                >
                  {canUpdate && (
                    <>
                      <button
                        type="button"
                        onClick={() => setDrawer({ open: true, mode: "edit", plan })}
                        className="text-sm text-spo-green-deep hover:underline"
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchiveClick(plan)}
                        className="text-sm text-spo-muted hover:text-spo-ink-2"
                      >
                        {plan.active ? t("common.archive") : t("common.unarchive")}
                      </button>
                    </>
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <PlanFormDrawer
        state={drawer}
        onClose={() => setDrawer({ open: false })}
        onSaved={() => {
          setDrawer({ open: false });
          startTransition(() => router.refresh());
        }}
      />

      <ConfirmModal
        open={!!confirming}
        title={t("plans.archive.title")}
        description={t("plans.archive.body")}
        confirmLabel={
          confirming?.toArchive ? t("common.archive") : t("common.unarchive")
        }
        cancelLabel={t("common.cancel")}
        intent={confirming?.toArchive ? "danger" : "primary"}
        onCancel={() => setConfirming(null)}
        onConfirm={confirmArchive}
      />

      <span className="sr-only" aria-live="polite">
        {pending ? "Loading" : ""}
      </span>
    </>
  );
}

function PlanFormDrawer({
  state,
  onClose,
  onSaved,
}: {
  state: DrawerState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("memberships");
  const toast = useToast();
  const isEdit = state.open && state.mode === "edit";
  const editingPlan = state.open && state.mode === "edit" ? state.plan : null;

  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [duration, setDuration] = useState("12");
  const [price, setPrice] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErr, setFieldErr] = useState<string | null>(null);

  // Hydrate form when drawer opens for create or for edit of a specific plan.
  const drawerKey = !state.open
    ? "closed"
    : state.mode === "create"
      ? "create"
      : `edit:${state.plan.id}`;

  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "create") {
      setCode("");
      setNameAr("");
      setNameEn("");
      setDuration("12");
      setPrice("0");
      setDiscount("0");
    } else {
      setCode(state.plan.code);
      setNameAr(state.plan.name_ar);
      setNameEn(state.plan.name_en);
      setDuration(String(state.plan.duration_months));
      setPrice(String(state.plan.price_sar));
      setDiscount(String(state.plan.member_only_store_discount_pct));
    }
    setFieldErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerKey]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErr(null);
    setSubmitting(true);
    const payload = {
      code: code.trim().toLowerCase(),
      name_ar: nameAr.trim(),
      name_en: nameEn.trim(),
      duration_months: Number(duration),
      price_sar: Number(price),
      member_only_store_discount_pct: Number(discount),
    };
    const res = isEdit && editingPlan
      ? await updatePlan({ id: editingPlan.id, ...payload })
      : await createPlan(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({
        tone: "success",
        title: isEdit ? t("toast.planUpdated") : t("toast.planCreated"),
      });
      onSaved();
    } else {
      if (res.error === "code-exists") setFieldErr(t("plans.errors.codeExists"));
      else setFieldErr(t("plans.errors.invalid"));
      toast.push({ tone: "error", title: t("toast.saveFailed") });
    }
  }

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={isEdit ? t("plans.form.editTitle") : t("plans.form.createTitle")}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormGroup
          label={t("plans.form.code")}
          hint={t("plans.form.codeHint")}
          required
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase())}
            required
            dir="ltr"
            placeholder="gold-12mo"
          />
        </FormGroup>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("plans.form.nameAr")} required>
            <Input
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              dir="rtl"
              required
            />
          </FormGroup>
          <FormGroup label={t("plans.form.nameEn")} required>
            <Input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <FormGroup label={t("plans.form.durationMonths")} required>
            <Input
              type="number"
              min={1}
              max={120}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
              dir="ltr"
            />
          </FormGroup>
          <FormGroup label={t("plans.form.priceSar")} required>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              dir="ltr"
            />
          </FormGroup>
          <FormGroup
            label={t("plans.form.discountPct")}
            hint={t("plans.form.discountHint")}
          >
            <Input
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
        </div>

        {fieldErr && <p className="text-sm text-spo-danger">{fieldErr}</p>}

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
