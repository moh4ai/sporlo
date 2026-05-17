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

import {
  createPaymentMethod,
  setPaymentMethodActive,
  updatePaymentMethod,
} from "../../actions";

export type MethodRow = {
  id: string;
  label: string;
  type: "cash" | "bank_transfer" | "pos_terminal" | "moyasar" | "other";
  details_note: string;
  active: boolean;
};

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; method: MethodRow };

export function MethodsClient({
  methods,
  principal,
}: {
  methods: MethodRow[];
  principal: Principal;
}) {
  const t = useTranslations("finance");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });

  const canCreate = useMemo(() => canPerform(principal, "create", "finance"), [principal]);
  const canUpdate = useMemo(() => canPerform(principal, "update", "finance"), [principal]);

  async function toggle(m: MethodRow) {
    const res = await setPaymentMethodActive({ id: m.id, active: !m.active });
    if (res.ok) {
      toast.push({
        tone: "success",
        title: m.active ? t("toast.methodDisabled") : t("toast.methodEnabled"),
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
          <h2 className="text-xl font-semibold text-spo-ink">{t("methods.title")}</h2>
          <p className="text-sm text-spo-muted">{t("methods.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
            {t("methods.newMethod")}
          </Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("methods.headers.label")}</TH>
            <TH>{t("methods.headers.type")}</TH>
            <TH>{t("methods.headers.status")}</TH>
            <TH>{t("methods.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {methods.length === 0 ? (
            <EmptyTableRow colSpan={4}>{t("methods.empty")}</EmptyTableRow>
          ) : (
            methods.map((m) => (
              <TR key={m.id}>
                <TD className="font-medium">{m.label}</TD>
                <TD>{t(`methods.types.${m.type}`)}</TD>
                <TD>
                  {m.active ? (
                    <Badge tone="green">{t("common.active")}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("common.disabled")}</Badge>
                  )}
                </TD>
                <TD className="space-x-2 rtl:space-x-reverse">
                  {canUpdate && (
                    <>
                      <button
                        type="button"
                        onClick={() => setDrawer({ open: true, mode: "edit", method: m })}
                        className="text-sm text-spo-green-deep hover:underline"
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(m)}
                        className="text-sm text-spo-muted hover:text-spo-ink-2"
                      >
                        {m.active ? t("common.disabled") : t("common.active")}
                      </button>
                    </>
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <MethodFormDrawer
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

function MethodFormDrawer({
  state,
  onClose,
  onSaved,
}: {
  state: DrawerState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("finance");
  const toast = useToast();
  const isEdit = state.open && state.mode === "edit";
  const editing = state.open && state.mode === "edit" ? state.method : null;

  const [label, setLabel] = useState("");
  const [type, setType] = useState<MethodRow["type"]>("cash");
  const [details, setDetails] = useState("");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErr, setFieldErr] = useState<string | null>(null);

  const drawerKey = !state.open
    ? "closed"
    : state.mode === "create"
      ? "create"
      : `edit:${state.method.id}`;

  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "create") {
      setLabel("");
      setType("cash");
      setDetails("");
      setActive(true);
    } else {
      setLabel(state.method.label);
      setType(state.method.type);
      setDetails(state.method.details_note);
      setActive(state.method.active);
    }
    setFieldErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerKey]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErr(null);
    setSubmitting(true);
    const payload = {
      label: label.trim(),
      type,
      details,
      active,
    };
    const res = isEdit && editing
      ? await updatePaymentMethod({ id: editing.id, ...payload })
      : await createPaymentMethod(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({
        tone: "success",
        title: isEdit ? t("toast.methodUpdated") : t("toast.methodCreated"),
      });
      onSaved();
    } else {
      if (res.error === "label-exists") setFieldErr(t("methods.errors.labelExists"));
      else setFieldErr(res.error);
      toast.push({ tone: "error", title: t("toast.saveFailed") });
    }
  }

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={isEdit ? t("methods.form.editTitle") : t("methods.form.createTitle")}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormGroup label={t("methods.form.label")} required>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </FormGroup>

        <FormGroup label={t("methods.form.type")} required>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as MethodRow["type"])}
          >
            <option value="cash">{t("methods.types.cash")}</option>
            <option value="bank_transfer">{t("methods.types.bank_transfer")}</option>
            <option value="pos_terminal">{t("methods.types.pos_terminal")}</option>
            <option value="moyasar">{t("methods.types.moyasar")}</option>
            <option value="other">{t("methods.types.other")}</option>
          </Select>
        </FormGroup>

        <FormGroup label={t("methods.form.details")}>
          <Textarea
            rows={2}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </FormGroup>

        <Switch
          checked={active}
          onChange={setActive}
          label={t("methods.form.active")}
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
