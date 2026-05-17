"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { canPerform, type Principal } from "@sporlo/auth";
import {
  Badge,
  Button,
  Checkbox,
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

import { createCoupon, setCouponActive, updateCoupon } from "../../actions";

export type CouponRow = {
  id: string;
  code: string;
  percent_off: number;
  used_count: number;
  max_uses: number | null;
  valid_from: string;
  valid_to: string | null;
  active: boolean;
};

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; coupon: CouponRow };

export function CouponsClient({
  initialCoupons,
  principal,
  locale,
}: {
  initialCoupons: CouponRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("memberships");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });

  const canCreate = useMemo(() => canPerform(principal, "create", "coupon"), [principal]);
  const canUpdate = useMemo(() => canPerform(principal, "update", "coupon"), [principal]);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [locale],
  );

  async function toggleActive(coupon: CouponRow) {
    const res = await setCouponActive({ id: coupon.id, active: !coupon.active });
    if (res.ok) {
      toast.push({
        tone: "success",
        title: coupon.active ? t("toast.couponDisabled") : t("toast.couponEnabled"),
      });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("coupons.title")}</h2>
          <p className="text-sm text-spo-muted">{t("coupons.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
            {t("coupons.newCoupon")}
          </Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("coupons.headers.code")}</TH>
            <TH>{t("coupons.headers.percent")}</TH>
            <TH>{t("coupons.headers.uses")}</TH>
            <TH>{t("coupons.headers.validFrom")}</TH>
            <TH>{t("coupons.headers.validTo")}</TH>
            <TH>{t("coupons.headers.status")}</TH>
            <TH>{t("coupons.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {initialCoupons.length === 0 ? (
            <EmptyTableRow colSpan={7}>{t("coupons.empty")}</EmptyTableRow>
          ) : (
            initialCoupons.map((c) => (
              <TR key={c.id}>
                <TD>
                  <code className="rounded bg-spo-paper px-1.5 py-0.5 text-xs">
                    {c.code}
                  </code>
                </TD>
                <TD>{c.percent_off}%</TD>
                <TD>
                  {c.used_count}
                  {c.max_uses ? ` / ${c.max_uses}` : ""}
                </TD>
                <TD className="text-xs text-spo-muted">
                  {dateFmt.format(new Date(c.valid_from))}
                </TD>
                <TD className="text-xs text-spo-muted">
                  {c.valid_to ? dateFmt.format(new Date(c.valid_to)) : "—"}
                </TD>
                <TD>
                  {c.active ? (
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
                        onClick={() => setDrawer({ open: true, mode: "edit", coupon: c })}
                        className="text-sm text-spo-green-deep hover:underline"
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(c)}
                        className="text-sm text-spo-muted hover:text-spo-ink-2"
                      >
                        {c.active ? t("common.archive") : t("common.unarchive")}
                      </button>
                    </>
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <CouponFormDrawer
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

function CouponFormDrawer({
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
  const coupon = state.open && state.mode === "edit" ? state.coupon : null;

  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [validTo, setValidTo] = useState("");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErr, setFieldErr] = useState<string | null>(null);

  const drawerKey = !state.open
    ? "closed"
    : state.mode === "create"
      ? "create"
      : `edit:${state.coupon.id}`;

  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "create") {
      setCode("");
      setPercent("10");
      setMaxUses("");
      setValidFrom(new Date().toISOString().slice(0, 10));
      setValidTo("");
      setActive(true);
    } else {
      setCode(state.coupon.code);
      setPercent(String(state.coupon.percent_off));
      setMaxUses(state.coupon.max_uses != null ? String(state.coupon.max_uses) : "");
      setValidFrom(state.coupon.valid_from.slice(0, 10));
      setValidTo(state.coupon.valid_to ? state.coupon.valid_to.slice(0, 10) : "");
      setActive(state.coupon.active);
    }
    setFieldErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerKey]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErr(null);
    setSubmitting(true);
    const payload = {
      code: code.trim().toUpperCase(),
      percent_off: Number(percent),
      max_uses: maxUses === "" ? undefined : Number(maxUses),
      valid_from: validFrom,
      valid_to: validTo === "" ? undefined : validTo,
      plan_scope: [],
      active,
    };
    const res = isEdit && coupon
      ? await updateCoupon({ id: coupon.id, ...payload })
      : await createCoupon(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({
        tone: "success",
        title: isEdit ? t("toast.couponUpdated") : t("toast.couponCreated"),
      });
      onSaved();
    } else {
      if (res.error === "code-exists") setFieldErr(t("coupons.errors.codeExists"));
      else setFieldErr(t("plans.errors.invalid"));
      toast.push({ tone: "error", title: t("toast.saveFailed") });
    }
  }

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={isEdit ? t("coupons.form.editTitle") : t("coupons.form.createTitle")}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormGroup
          label={t("coupons.form.code")}
          hint={t("coupons.form.codeHint")}
          required
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            dir="ltr"
            required
          />
        </FormGroup>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("coupons.form.percent")} required>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
          <FormGroup label={t("coupons.form.maxUses")}>
            <Input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("coupons.form.validFrom")} required>
            <Input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
          <FormGroup label={t("coupons.form.validTo")}>
            <Input
              type="date"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
        </div>

        <Checkbox
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          label={t("coupons.form.active")}
        />

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
