"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import {
  Button,
  ConfirmModal,
  Drawer,
  EmptyTableRow,
  FormGroup,
  Input,
  Modal,
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
  adjustStock,
  createVariant,
  deleteVariant,
  updateVariant,
} from "../../actions";

export type VariantRow = {
  id: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  price_sar: number;
  member_price_sar: number | null;
  stock: number;
};

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; variant: VariantRow };

export function VariantsClient({
  productId,
  variants,
}: {
  productId: string;
  variants: VariantRow[];
}) {
  const t = useTranslations("store");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });
  const [adjusting, setAdjusting] = useState<VariantRow | null>(null);
  const [deleting, setDeleting] = useState<VariantRow | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-spo-ink">{t("variants.title")}</h3>
        <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
          {t("variants.addVariant")}
        </Button>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("variants.headers.sku")}</TH>
            <TH>{t("variants.headers.size")}</TH>
            <TH>{t("variants.headers.color")}</TH>
            <TH>{t("variants.headers.price")}</TH>
            <TH>{t("variants.headers.memberPrice")}</TH>
            <TH>{t("variants.headers.stock")}</TH>
            <TH>{t("variants.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {variants.length === 0 ? (
            <EmptyTableRow colSpan={7}>{t("variants.empty")}</EmptyTableRow>
          ) : (
            variants.map((v) => (
              <TR key={v.id}>
                <TD>
                  {v.sku ? (
                    <code className="rounded bg-spo-paper px-1.5 py-0.5 text-xs">{v.sku}</code>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD>{v.size ?? "—"}</TD>
                <TD>{v.color ?? "—"}</TD>
                <TD>{v.price_sar.toFixed(2)}</TD>
                <TD>{v.member_price_sar != null ? v.member_price_sar.toFixed(2) : "—"}</TD>
                <TD>{v.stock}</TD>
                <TD className="space-x-2 rtl:space-x-reverse">
                  <button
                    type="button"
                    onClick={() => setDrawer({ open: true, mode: "edit", variant: v })}
                    className="text-sm text-spo-green-deep hover:underline"
                  >
                    {t("common.edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjusting(v)}
                    className="text-sm text-spo-muted hover:text-spo-ink-2"
                  >
                    ±
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(v)}
                    className="text-sm text-spo-danger hover:underline"
                  >
                    {t("common.delete")}
                  </button>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <VariantFormDrawer
        productId={productId}
        state={drawer}
        onClose={() => setDrawer({ open: false })}
        onSaved={() => {
          setDrawer({ open: false });
          startTransition(() => router.refresh());
        }}
      />

      {adjusting && (
        <StockAdjustModal
          variant={adjusting}
          onClose={() => setAdjusting(null)}
          onDone={() => {
            setAdjusting(null);
            startTransition(() => router.refresh());
          }}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        title={t("common.delete")}
        description={deleting?.sku ?? deleting?.size ?? ""}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        intent="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteVariant({ id: deleting.id });
          if (res.ok) {
            toast.push({ tone: "success", title: t("toast.variantDeleted") });
            setDeleting(null);
            startTransition(() => router.refresh());
          } else {
            toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
          }
        }}
      />
    </div>
  );
}

function VariantFormDrawer({
  productId,
  state,
  onClose,
  onSaved,
}: {
  productId: string;
  state: DrawerState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("store");
  const toast = useToast();
  const isEdit = state.open && state.mode === "edit";
  const editing = state.open && state.mode === "edit" ? state.variant : null;

  const [sku, setSku] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [price, setPrice] = useState("0");
  const [memberPrice, setMemberPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const key = !state.open ? "closed" : state.mode === "create" ? "create" : `edit:${state.variant.id}`;
  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "create") {
      setSku("");
      setSize("");
      setColor("");
      setPrice("0");
      setMemberPrice("");
      setStock("0");
    } else {
      setSku(state.variant.sku ?? "");
      setSize(state.variant.size ?? "");
      setColor(state.variant.color ?? "");
      setPrice(String(state.variant.price_sar));
      setMemberPrice(state.variant.member_price_sar != null ? String(state.variant.member_price_sar) : "");
      setStock(String(state.variant.stock));
    }
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const payload = {
      product_id: productId,
      sku,
      size,
      color,
      price_sar: Number(price),
      member_price_sar: memberPrice === "" ? undefined : Number(memberPrice),
      stock: Number(stock),
    };
    const res = isEdit && editing
      ? await updateVariant({ id: editing.id, ...payload })
      : await createVariant(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({
        tone: "success",
        title: isEdit ? t("toast.variantUpdated") : t("toast.variantAdded"),
      });
      onSaved();
    } else {
      if (res.error === "sku-exists") setErr(t("variants.errors.skuExists"));
      else setErr(res.error);
      toast.push({ tone: "error", title: t("toast.saveFailed") });
    }
  }

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={isEdit ? t("variants.form.editTitle") : t("variants.form.title")}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormGroup label={t("variants.form.sku")}>
          <Input value={sku} onChange={(e) => setSku(e.target.value)} dir="ltr" />
        </FormGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("variants.form.size")}>
            <Input value={size} onChange={(e) => setSize(e.target.value)} />
          </FormGroup>
          <FormGroup label={t("variants.form.color")}>
            <Input value={color} onChange={(e) => setColor(e.target.value)} />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormGroup label={t("variants.form.price")} required>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
          <FormGroup label={t("variants.form.memberPrice")}>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={memberPrice}
              onChange={(e) => setMemberPrice(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
          <FormGroup label={t("variants.form.stock")}>
            <Input
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
        </div>
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

function StockAdjustModal({
  variant,
  onClose,
  onDone,
}: {
  variant: VariantRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations("store");
  const toast = useToast();
  const [delta, setDelta] = useState("0");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const res = await adjustStock({
      variant_id: variant.id,
      delta: Number(delta),
      note,
    });
    setBusy(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.stockAdjusted") });
      onDone();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Modal open onClose={onClose} title={t("variants.adjust.title")}>
      <div className="space-y-4">
        <FormGroup label={t("variants.adjust.delta")} required>
          <Input
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            dir="ltr"
            required
          />
        </FormGroup>
        <FormGroup label={t("variants.adjust.note")}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormGroup>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy}>
            {t("common.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
