"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
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
  archiveProduct,
  createProduct,
  removeProductImage,
  reorderProductImages,
  updateProduct,
  uploadProductImages,
} from "../actions";

export type ProductImage = { path: string; url: string };

export type ProductRow = {
  id: string;
  name_ar: string;
  name_en: string;
  category: string | null;
  category_ar: string | null;
  category_en: string | null;
  active: boolean;
  image_url: string | null;
  images: ProductImage[];
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
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt=""
                        className="size-10 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="size-10 shrink-0 rounded-md bg-spo-paper-warm" />
                    )}
                    <Link
                      href={`/store/${p.id}`}
                      className="text-spo-green-deep hover:underline"
                    >
                      {name(p)}
                    </Link>
                  </div>
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
  const [categoryAr, setCategoryAr] = useState("");
  const [categoryEn, setCategoryEn] = useState("");
  const [active, setActive] = useState(true);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const key = !state.open ? "closed" : state.mode === "create" ? "create" : `edit:${state.product.id}`;
  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "create") {
      setNameAr("");
      setNameEn("");
      setDescAr("");
      setDescEn("");
      setCategoryAr("");
      setCategoryEn("");
      setActive(true);
      setImages([]);
    } else {
      setNameAr(state.product.name_ar);
      setNameEn(state.product.name_en);
      setDescAr("");
      setDescEn("");
      setCategoryAr(state.product.category_ar ?? "");
      setCategoryEn(state.product.category_en ?? state.product.category ?? "");
      setActive(state.product.active);
      setImages(state.product.images);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function handleFiles(files: FileList | null) {
    if (!editing) {
      toast.push({
        tone: "error",
        title: t("toast.saveFailed"),
        description: t("products.form.imageSaveFirst"),
      });
      return;
    }
    if (!files || files.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("product_id", editing.id);
    for (const file of Array.from(files)) fd.append("images", file);
    const res = await uploadProductImages(fd);
    setUploading(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.productUpdated") });
      onSaved();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  async function handleRemove(path: string) {
    if (!editing) return;
    const res = await removeProductImage({ product_id: editing.id, path });
    if (res.ok) {
      setImages((prev) => prev.filter((img) => img.path !== path));
      toast.push({ tone: "success", title: t("toast.productUpdated") });
      onSaved();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  async function handleReorder(nextPaths: string[]) {
    if (!editing) return;
    const res = await reorderProductImages({
      product_id: editing.id,
      paths: nextPaths,
    });
    if (res.ok) {
      const byPath = new Map(images.map((img) => [img.path, img]));
      setImages(
        nextPaths
          .map((p) => byPath.get(p))
          .filter((img): img is ProductImage => !!img),
      );
      onSaved();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  function moveImage(index: number, delta: -1 | 1) {
    const next = index + delta;
    if (next < 0 || next >= images.length) return;
    const arr = images.slice();
    const tmp = arr[index]!;
    arr[index] = arr[next]!;
    arr[next] = tmp;
    void handleReorder(arr.map((img) => img.path));
  }

  function setCover(index: number) {
    if (index === 0) return;
    const arr = images.slice();
    const [picked] = arr.splice(index, 1);
    if (!picked) return;
    arr.unshift(picked);
    void handleReorder(arr.map((img) => img.path));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      name_ar: nameAr.trim(),
      name_en: nameEn.trim(),
      description_ar: descAr,
      description_en: descEn,
      // Legacy single column kept in sync with the English value so old
      // queries that don't know about the bilingual pair still render.
      category: categoryEn || categoryAr,
      category_ar: categoryAr,
      category_en: categoryEn,
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
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("products.form.categoryAr")}>
            <Input
              value={categoryAr}
              onChange={(e) => setCategoryAr(e.target.value)}
              dir="rtl"
            />
          </FormGroup>
          <FormGroup label={t("products.form.categoryEn")}>
            <Input
              value={categoryEn}
              onChange={(e) => setCategoryEn(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
        </div>
        <Switch checked={active} onChange={setActive} label={t("products.form.active")} />

        {isEdit && editing && (
          <div className="space-y-3 rounded-card border border-spo-line bg-spo-paper/40 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-spo-ink">
                {t("products.form.image")}
              </h3>
              <span className="text-xs text-spo-muted">
                {images.length}/6
              </span>
            </div>

            {images.length > 0 ? (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((img, i) => (
                  <li
                    key={img.path}
                    className="group relative overflow-hidden rounded-md border border-spo-line bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                    {i === 0 && (
                      <span className="absolute start-1 top-1 rounded-pill bg-spo-green px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {t("products.form.coverBadge")}
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-spo-ink/70 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveImage(i, -1)}
                          disabled={i === 0}
                          aria-label="Move left"
                          className="rounded p-0.5 text-white hover:bg-white/20 disabled:opacity-30"
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(i, 1)}
                          disabled={i === images.length - 1}
                          aria-label="Move right"
                          className="rounded p-0.5 text-white hover:bg-white/20 disabled:opacity-30"
                        >
                          ›
                        </button>
                        {i !== 0 && (
                          <button
                            type="button"
                            onClick={() => setCover(i)}
                            aria-label="Set as cover"
                            title={t("products.form.setCover")}
                            className="rounded p-0.5 text-white hover:bg-white/20"
                          >
                            ★
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(img.path)}
                        aria-label="Remove image"
                        className="rounded p-0.5 text-white hover:bg-spo-danger"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-spo-muted">
                {t("products.form.imageEmpty")}
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              disabled={uploading || images.length >= 6}
              onChange={async (e) => {
                await handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="ghost"
              disabled={uploading || images.length >= 6}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading
                ? t("products.form.imageUploading")
                : t("products.form.imageAdd")}
            </Button>
            <p className="text-xs text-spo-muted">
              {t("products.form.imageHint")}
            </p>
          </div>
        )}

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
