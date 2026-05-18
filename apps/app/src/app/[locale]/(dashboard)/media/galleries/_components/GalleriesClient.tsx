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

import { createGallery, deleteGallery, updateGallery } from "../../actions";

export type GalleryRow = {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  cover_image_path: string | null;
  display_order: number;
  published_at: string | null;
  item_count: number;
};

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; gallery: GalleryRow };

export function GalleriesClient({
  galleries,
  principal,
  locale,
}: {
  galleries: GalleryRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("media");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canCreate = useMemo(
    () => canPerform(principal, "create", "media_gallery"),
    [principal],
  );
  const canUpdate = useMemo(
    () => canPerform(principal, "update", "media_gallery"),
    [principal],
  );
  const canDelete = useMemo(
    () => canPerform(principal, "delete", "media_gallery"),
    [principal],
  );
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });
  const [deleting, setDeleting] = useState<GalleryRow | null>(null);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [locale],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">
            {t("galleries.title")}
          </h2>
          <p className="text-sm text-spo-muted">{t("galleries.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
            {t("galleries.newGallery")}
          </Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("galleries.headers.title")}</TH>
            <TH>{t("galleries.headers.items")}</TH>
            <TH>{t("galleries.headers.status")}</TH>
            <TH>{t("galleries.headers.publishedAt")}</TH>
            <TH>{t("galleries.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {galleries.length === 0 ? (
            <EmptyTableRow colSpan={5}>{t("galleries.empty")}</EmptyTableRow>
          ) : (
            galleries.map((g) => (
              <TR key={g.id}>
                <TD className="font-medium">
                  {locale === "ar" ? g.title_ar : g.title_en}
                </TD>
                <TD>{g.item_count}</TD>
                <TD>
                  {g.published_at ? (
                    <Badge tone="green">{t("common.published")}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("common.draft")}</Badge>
                  )}
                </TD>
                <TD className="text-xs text-spo-muted">
                  {g.published_at
                    ? dateFmt.format(new Date(g.published_at))
                    : "—"}
                </TD>
                <TD className="space-x-2 rtl:space-x-reverse">
                  {canUpdate && (
                    <>
                      <Link
                        href={`/media/galleries/${g.id}`}
                        className="text-sm text-spo-green-deep hover:underline"
                      >
                        {t("galleries.manageItems")}
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          setDrawer({ open: true, mode: "edit", gallery: g })
                        }
                        className="text-sm text-spo-ink-2 hover:underline"
                      >
                        {t("common.edit")}
                      </button>
                    </>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleting(g)}
                      className="text-sm text-spo-danger hover:underline"
                    >
                      {t("common.delete")}
                    </button>
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <GalleryFormDrawer
        state={drawer}
        onClose={() => setDrawer({ open: false })}
        onSaved={() => {
          setDrawer({ open: false });
          startTransition(() => router.refresh());
        }}
      />

      <ConfirmModal
        open={!!deleting}
        title={t("common.delete")}
        description={
          deleting
            ? locale === "ar"
              ? deleting.title_ar
              : deleting.title_en
            : ""
        }
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        intent="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteGallery({ id: deleting.id });
          if (res.ok) {
            toast.push({
              tone: "success",
              title: t("galleries.toast.deleted"),
            });
            setDeleting(null);
            startTransition(() => router.refresh());
          } else {
            toast.push({
              tone: "error",
              title: t("toast.saveFailed"),
              description: res.error,
            });
          }
        }}
      />
    </div>
  );
}

function GalleryFormDrawer({
  state,
  onClose,
  onSaved,
}: {
  state: DrawerState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("media");
  const toast = useToast();
  const isEdit = state.open && state.mode === "edit";
  const editing = state.open && state.mode === "edit" ? state.gallery : null;

  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [order, setOrder] = useState("0");
  const [publishNow, setPublishNow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const key = !state.open
    ? "closed"
    : state.mode === "create"
      ? "create"
      : `edit:${state.gallery.id}`;
  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "create") {
      setTitleAr("");
      setTitleEn("");
      setDescAr("");
      setDescEn("");
      setOrder("0");
      setPublishNow(false);
    } else {
      setTitleAr(state.gallery.title_ar);
      setTitleEn(state.gallery.title_en);
      setDescAr(state.gallery.description_ar ?? "");
      setDescEn(state.gallery.description_en ?? "");
      setOrder(String(state.gallery.display_order));
      setPublishNow(!!state.gallery.published_at);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      title_ar: titleAr.trim(),
      title_en: titleEn.trim(),
      description_ar: descAr,
      description_en: descEn,
      cover_image_path: "",
      display_order: Number(order) || 0,
      publish_now: publishNow,
    };
    const res =
      isEdit && editing
        ? await updateGallery({ id: editing.id, ...payload })
        : await createGallery(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({
        tone: "success",
        title: isEdit
          ? t("galleries.toast.updated")
          : t("galleries.toast.created"),
      });
      onSaved();
    } else {
      toast.push({
        tone: "error",
        title: t("toast.saveFailed"),
        description: res.error,
      });
    }
  }

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={
        isEdit ? t("galleries.form.editTitle") : t("galleries.form.createTitle")
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("galleries.form.titleAr")} required>
            <Input
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              dir="rtl"
              required
            />
          </FormGroup>
          <FormGroup label={t("galleries.form.titleEn")} required>
            <Input
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("galleries.form.descriptionAr")}>
            <Textarea
              rows={3}
              value={descAr}
              onChange={(e) => setDescAr(e.target.value)}
              dir="rtl"
            />
          </FormGroup>
          <FormGroup label={t("galleries.form.descriptionEn")}>
            <Textarea
              rows={3}
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
        </div>
        <FormGroup
          label={t("galleries.form.displayOrder")}
          hint={t("galleries.form.displayOrderHint")}
        >
          <Input
            type="number"
            min={0}
            max={9999}
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            dir="ltr"
          />
        </FormGroup>
        <Switch
          checked={publishNow}
          onChange={setPublishNow}
          label={t("galleries.form.publishNow")}
        />
        <p className="rounded-card border border-dashed border-spo-line p-3 text-xs text-spo-muted">
          {t("galleries.form.uploadHint")}
        </p>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
          >
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
