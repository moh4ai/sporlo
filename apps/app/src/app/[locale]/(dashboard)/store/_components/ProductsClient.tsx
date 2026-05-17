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

import { archiveProduct, createProduct, updateProduct } from "../actions";

export type ProductRow = {
  id: string;
  name_ar: string;
  name_en: string;
  category: string | null;
  active: boolean;
  variant_count: number;
  stock_total: number;
};

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; product: ProductRow };

export function ProductsClient({
  products,
  principal,
  locale,
}: {
  products: ProductRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("store");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });
  const canCreate = useMemo(() => canPerform(principal, "create", "store"), [principal]);
  const canUpdate = useMemo(() => canPerform(principal, "update", "store"), [principal]);

  function name(p: ProductRow) {
    return locale === "ar" ? p.name_ar : p.name_en;
  }

  async function toggleArchive(p: ProductRow) {
    const res = await archiveProduct({ id: p.id, archive: p.active });
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.productArchived") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("products.title")}</h2>
          <p className="text-sm text-spo-muted">{t("products.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
            {t("products.newProduct")}
          </Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("products.headers.name")}</TH>
            <TH>{t("products.headers.category")}</TH>
            <TH>{t("products.headers.variants")}</TH>
            <TH>{t("products.headers.stock")}</TH>
            <TH>{t("products.headers.status")}</TH>
            <TH>{t("products.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {products.length === 0 ? (
            <EmptyTableRow colSpan={6}>{t("products.empty")}</EmptyTableRow>
          ) : (
            products.map((p) => (
              <TR key={p.id}>
                <TD className="font-medium">
                  <Link
                    href={`/store/${p.id}`}
                    className="text-spo-green-deep hover:underline"
                  >
                    {name(p)}
                  </Link>
                </TD>
                <TD>{p.category ?? "—"}</TD>
                <TD>{p.variant_count}</TD>
                <TD>{p.stock_total}</TD>
                <TD>
                  {p.active ? (
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
                        onClick={() => setDrawer({ open: true, mode: "edit", product: p })}
                        className="text-sm text-spo-green-deep hover:underline"
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleArchive(p)}
                        className="text-sm text-spo-muted hover:text-spo-ink-2"
                      >
                        {p.active ? t("common.archived") : t("common.active")}
                      </button>
                    </>
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <ProductFormDrawer
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

function ProductFormDrawer({
  state,
  onClose,
  onSaved,
}: {
  state: DrawerState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("store");
  const toast = useToast();
  const isEdit = state.open && state.mode === "edit";
  const editing = state.open && state.mode === "edit" ? state.product : null;

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [category, setCategory] = useState("");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const key = !state.open ? "closed" : state.mode === "create" ? "create" : `edit:${state.product.id}`;
  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "create") {
      setNameAr("");
      setNameEn("");
      setDescAr("");
      setDescEn("");
      setCategory("");
      setActive(true);
    } else {
      setNameAr(state.product.name_ar);
      setNameEn(state.product.name_en);
      setDescAr("");
      setDescEn("");
      setCategory(state.product.category ?? "");
      setActive(state.product.active);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      name_ar: nameAr.trim(),
      name_en: nameEn.trim(),
      description_ar: descAr,
      description_en: descEn,
      category,
      active,
    };
    const res = isEdit && editing
      ? await updateProduct({ id: editing.id, ...payload })
      : await createProduct(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({
        tone: "success",
        title: isEdit ? t("toast.productUpdated") : t("toast.productCreated"),
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
      title={isEdit ? t("products.form.editTitle") : t("products.form.createTitle")}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("products.form.nameAr")} required>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" required />
          </FormGroup>
          <FormGroup label={t("products.form.nameEn")} required>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" required />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("products.form.descriptionAr")}>
            <Textarea rows={2} value={descAr} onChange={(e) => setDescAr(e.target.value)} dir="rtl" />
          </FormGroup>
          <FormGroup label={t("products.form.descriptionEn")}>
            <Textarea rows={2} value={descEn} onChange={(e) => setDescEn(e.target.value)} dir="ltr" />
          </FormGroup>
        </div>
        <FormGroup label={t("products.form.category")}>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </FormGroup>
        <Switch checked={active} onChange={setActive} label={t("products.form.active")} />
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
