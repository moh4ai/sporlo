"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
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

import { useRouter } from "@/i18n/navigation";

import { createPage, deletePage, updatePage } from "../actions";

export type PageRow = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  body_ar: string | null;
  body_en: string | null;
  hero_image_path: string | null;
  published: boolean;
  updated_at: string;
};

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; page: PageRow };

export function PagesClient({
  pages,
  principal,
  locale,
}: {
  pages: PageRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("media");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canCreate = useMemo(() => canPerform(principal, "create", "public_page"), [principal]);
  const canUpdate = useMemo(() => canPerform(principal, "update", "public_page"), [principal]);
  const canDelete = useMemo(() => canPerform(principal, "delete", "public_page"), [principal]);
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });
  const [deleting, setDeleting] = useState<PageRow | null>(null);

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
          <h2 className="text-xl font-semibold text-spo-ink">{t("pages.title")}</h2>
          <p className="text-sm text-spo-muted">{t("pages.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
            {t("pages.newPage")}
          </Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("pages.headers.title")}</TH>
            <TH>{t("pages.headers.slug")}</TH>
            <TH>{t("pages.headers.status")}</TH>
            <TH>{t("pages.headers.updatedAt")}</TH>
            <TH>{t("pages.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {pages.length === 0 ? (
            <EmptyTableRow colSpan={5}>{t("pages.empty")}</EmptyTableRow>
          ) : (
            pages.map((p) => (
              <TR key={p.id}>
                <TD className="font-medium">
                  {locale === "ar" ? p.title_ar : p.title_en}
                </TD>
                <TD className="font-mono text-xs">{p.slug}</TD>
                <TD>
                  {p.published ? (
                    <Badge tone="green">{t("common.published")}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("common.draft")}</Badge>
                  )}
                </TD>
                <TD className="text-xs text-spo-muted">
                  {dateFmt.format(new Date(p.updated_at))}
                </TD>
                <TD className="space-x-2 rtl:space-x-reverse">
                  {canUpdate && (
                    <button
                      type="button"
                      onClick={() => setDrawer({ open: true, mode: "edit", page: p })}
                      className="text-sm text-spo-green-deep hover:underline"
                    >
                      {t("common.edit")}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleting(p)}
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

      <PageFormDrawer
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
        description={deleting ? `${deleting.slug}` : ""}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        intent="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deletePage({ id: deleting.id });
          if (res.ok) {
            toast.push({ tone: "success", title: t("toast.pageDeleted") });
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

function PageFormDrawer({
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
  const editing = state.open && state.mode === "edit" ? state.page : null;

  const [slug, setSlug] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [heroPath, setHeroPath] = useState("");
  const [published, setPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slugErr, setSlugErr] = useState<string | null>(null);

  const key = !state.open ? "closed" : state.mode === "create" ? "create" : `edit:${state.page.id}`;
  useEffect(() => {
    if (!state.open) return;
    setSlugErr(null);
    if (state.mode === "create") {
      setSlug("");
      setTitleAr("");
      setTitleEn("");
      setBodyAr("");
      setBodyEn("");
      setHeroPath("");
      setPublished(false);
    } else {
      setSlug(state.page.slug);
      setTitleAr(state.page.title_ar);
      setTitleEn(state.page.title_en);
      setBodyAr(state.page.body_ar ?? "");
      setBodyEn(state.page.body_en ?? "");
      setHeroPath(state.page.hero_image_path ?? "");
      setPublished(state.page.published);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSlugErr(null);
    setSubmitting(true);
    const payload = {
      slug: slug.trim(),
      title_ar: titleAr.trim(),
      title_en: titleEn.trim(),
      body_ar: bodyAr,
      body_en: bodyEn,
      hero_image_path: heroPath,
      published,
    };
    const res = isEdit && editing
      ? await updatePage({ id: editing.id, ...payload })
      : await createPage(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({
        tone: "success",
        title: isEdit ? t("toast.pageUpdated") : t("toast.pageCreated"),
      });
      onSaved();
    } else {
      if (res.field === "slug") setSlugErr(t("pages.errors.slugTaken"));
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={isEdit ? t("pages.form.editTitle") : t("pages.form.createTitle")}
      widthClassName="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-4">
        <FormGroup label={t("pages.form.slug")} required hint={t("pages.form.slugHint")}>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            dir="ltr"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          />
          {slugErr && <p className="mt-1 text-sm text-spo-danger">{slugErr}</p>}
        </FormGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("pages.form.titleAr")} required>
            <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} dir="rtl" required />
          </FormGroup>
          <FormGroup label={t("pages.form.titleEn")} required>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} dir="ltr" required />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("pages.form.bodyAr")}>
            <Textarea rows={8} value={bodyAr} onChange={(e) => setBodyAr(e.target.value)} dir="rtl" />
          </FormGroup>
          <FormGroup label={t("pages.form.bodyEn")}>
            <Textarea rows={8} value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} dir="ltr" />
          </FormGroup>
        </div>
        <FormGroup label={t("pages.form.heroImage")}>
          <Input value={heroPath} onChange={(e) => setHeroPath(e.target.value)} dir="ltr" />
        </FormGroup>
        <Switch checked={published} onChange={setPublished} label={t("pages.form.published")} />
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
