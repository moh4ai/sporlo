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

import { createArticle, deleteArticle, updateArticle } from "../../actions";

export type ArticleRow = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  excerpt_ar: string | null;
  excerpt_en: string | null;
  body_ar: string | null;
  body_en: string | null;
  cover_image_path: string | null;
  published_at: string | null;
};

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; article: ArticleRow };

export function NewsClient({
  articles,
  principal,
  locale,
}: {
  articles: ArticleRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("media");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canCreate = useMemo(() => canPerform(principal, "create", "news_article"), [principal]);
  const canUpdate = useMemo(() => canPerform(principal, "update", "news_article"), [principal]);
  const canDelete = useMemo(() => canPerform(principal, "delete", "news_article"), [principal]);
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });
  const [deleting, setDeleting] = useState<ArticleRow | null>(null);

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
          <h2 className="text-xl font-semibold text-spo-ink">{t("news.title")}</h2>
          <p className="text-sm text-spo-muted">{t("news.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
            {t("news.newArticle")}
          </Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("news.headers.title")}</TH>
            <TH>{t("news.headers.slug")}</TH>
            <TH>{t("news.headers.status")}</TH>
            <TH>{t("news.headers.publishedAt")}</TH>
            <TH>{t("news.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {articles.length === 0 ? (
            <EmptyTableRow colSpan={5}>{t("news.empty")}</EmptyTableRow>
          ) : (
            articles.map((a) => (
              <TR key={a.id}>
                <TD className="font-medium">
                  {locale === "ar" ? a.title_ar : a.title_en}
                </TD>
                <TD className="font-mono text-xs">{a.slug}</TD>
                <TD>
                  {a.published_at ? (
                    <Badge tone="green">{t("common.published")}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("common.draft")}</Badge>
                  )}
                </TD>
                <TD className="text-xs text-spo-muted">
                  {a.published_at ? dateFmt.format(new Date(a.published_at)) : "—"}
                </TD>
                <TD className="space-x-2 rtl:space-x-reverse">
                  {canUpdate && (
                    <button
                      type="button"
                      onClick={() => setDrawer({ open: true, mode: "edit", article: a })}
                      className="text-sm text-spo-green-deep hover:underline"
                    >
                      {t("common.edit")}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleting(a)}
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

      <ArticleFormDrawer
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
        description={deleting?.slug ?? ""}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        intent="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteArticle({ id: deleting.id });
          if (res.ok) {
            toast.push({ tone: "success", title: t("toast.articleDeleted") });
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

function ArticleFormDrawer({
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
  const editing = state.open && state.mode === "edit" ? state.article : null;

  const [slug, setSlug] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [excerptAr, setExcerptAr] = useState("");
  const [excerptEn, setExcerptEn] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [coverPath, setCoverPath] = useState("");
  const [publishNow, setPublishNow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slugErr, setSlugErr] = useState<string | null>(null);

  const key = !state.open ? "closed" : state.mode === "create" ? "create" : `edit:${state.article.id}`;
  useEffect(() => {
    if (!state.open) return;
    setSlugErr(null);
    if (state.mode === "create") {
      setSlug("");
      setTitleAr("");
      setTitleEn("");
      setExcerptAr("");
      setExcerptEn("");
      setBodyAr("");
      setBodyEn("");
      setCoverPath("");
      setPublishNow(false);
    } else {
      setSlug(state.article.slug);
      setTitleAr(state.article.title_ar);
      setTitleEn(state.article.title_en);
      setExcerptAr(state.article.excerpt_ar ?? "");
      setExcerptEn(state.article.excerpt_en ?? "");
      setBodyAr(state.article.body_ar ?? "");
      setBodyEn(state.article.body_en ?? "");
      setCoverPath(state.article.cover_image_path ?? "");
      setPublishNow(!!state.article.published_at);
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
      excerpt_ar: excerptAr,
      excerpt_en: excerptEn,
      body_ar: bodyAr,
      body_en: bodyEn,
      cover_image_path: coverPath,
      publish_now: publishNow,
    };
    const res = isEdit && editing
      ? await updateArticle({ id: editing.id, ...payload })
      : await createArticle(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({
        tone: "success",
        title: isEdit ? t("toast.articleUpdated") : t("toast.articleCreated"),
      });
      onSaved();
    } else {
      if (res.field === "slug") setSlugErr(t("news.errors.slugTaken"));
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={isEdit ? t("news.form.editTitle") : t("news.form.createTitle")}
      widthClassName="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-4">
        <FormGroup label={t("news.form.slug")} required>
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
          <FormGroup label={t("news.form.titleAr")} required>
            <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} dir="rtl" required />
          </FormGroup>
          <FormGroup label={t("news.form.titleEn")} required>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} dir="ltr" required />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("news.form.excerptAr")}>
            <Textarea rows={2} value={excerptAr} onChange={(e) => setExcerptAr(e.target.value)} dir="rtl" />
          </FormGroup>
          <FormGroup label={t("news.form.excerptEn")}>
            <Textarea rows={2} value={excerptEn} onChange={(e) => setExcerptEn(e.target.value)} dir="ltr" />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("news.form.bodyAr")}>
            <Textarea rows={10} value={bodyAr} onChange={(e) => setBodyAr(e.target.value)} dir="rtl" />
          </FormGroup>
          <FormGroup label={t("news.form.bodyEn")}>
            <Textarea rows={10} value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} dir="ltr" />
          </FormGroup>
        </div>
        <FormGroup label={t("news.form.coverImage")}>
          <Input value={coverPath} onChange={(e) => setCoverPath(e.target.value)} dir="ltr" />
        </FormGroup>
        <Switch checked={publishNow} onChange={setPublishNow} label={t("news.form.publishNow")} />
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
