"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { canPerform, type Principal } from "@sporlo/auth";
import {
  Button,
  Card,
  ConfirmModal,
  FileUpload,
  Input,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import {
  removeGalleryItem,
  reorderGalleryItems,
  updateGalleryItem,
  uploadGalleryItem,
} from "../../../actions";

export type GalleryItemRow = {
  id: string;
  image_path: string;
  image_url: string;
  caption_ar: string;
  caption_en: string;
  display_order: number;
};

export function GalleryItemsClient({
  galleryId,
  items,
  principal,
  locale,
}: {
  galleryId: string;
  items: GalleryItemRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("media");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canUpdate = useMemo(
    () => canPerform(principal, "update", "media_gallery"),
    [principal],
  );

  const [drafts, setDrafts] = useState<Record<string, { ar: string; en: string }>>(
    () =>
      Object.fromEntries(
        items.map((it) => [it.id, { ar: it.caption_ar, en: it.caption_en }]),
      ),
  );
  const [removing, setRemoving] = useState<GalleryItemRow | null>(null);
  const [uploading, setUploading] = useState(false);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleFile(file: File) {
    if (!canUpdate) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("gallery_id", galleryId);
    fd.append("image", file);
    const res = await uploadGalleryItem(fd);
    setUploading(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("galleries.toast.itemAdded") });
      refresh();
    } else {
      toast.push({
        tone: "error",
        title: t("toast.saveFailed"),
        description: res.error,
      });
    }
  }

  async function saveCaption(item: GalleryItemRow) {
    const draft = drafts[item.id]!;
    const res = await updateGalleryItem({
      id: item.id,
      caption_ar: draft.ar,
      caption_en: draft.en,
    });
    if (res.ok) {
      toast.push({ tone: "success", title: t("galleries.toast.captionSaved") });
    } else {
      toast.push({
        tone: "error",
        title: t("toast.saveFailed"),
        description: res.error,
      });
    }
  }

  async function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved!);
    const res = await reorderGalleryItems({
      gallery_id: galleryId,
      order: next.map((x) => x.id),
    });
    if (res.ok) {
      toast.push({ tone: "success", title: t("galleries.toast.reordered") });
      refresh();
    } else {
      toast.push({
        tone: "error",
        title: t("toast.saveFailed"),
        description: res.error,
      });
    }
  }

  return (
    <div className="space-y-6">
      {canUpdate && (
        <Card className="space-y-3">
          <h3 className="text-base font-medium text-spo-ink">
            {t("galleries.uploadTitle")}
          </h3>
          <FileUpload
            label={t("galleries.uploadLabel")}
            hint={t("galleries.uploadAccept")}
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading}
            onFile={handleFile}
          />
        </Card>
      )}

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-spo-muted">{t("galleries.emptyItems")}</p>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item, idx) => {
            const draft = drafts[item.id]!;
            return (
              <li key={item.id}>
                <Card className="space-y-3">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-spo-paper">
                    <Image
                      src={item.image_url}
                      alt={
                        locale === "ar"
                          ? item.caption_ar || item.caption_en
                          : item.caption_en || item.caption_ar
                      }
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={draft.ar}
                      onChange={(e) =>
                        setDrafts((d) => ({
                          ...d,
                          [item.id]: { ...d[item.id]!, ar: e.target.value },
                        }))
                      }
                      dir="rtl"
                      placeholder={t("galleries.captionArPlaceholder")}
                      disabled={!canUpdate}
                    />
                    <Input
                      value={draft.en}
                      onChange={(e) =>
                        setDrafts((d) => ({
                          ...d,
                          [item.id]: { ...d[item.id]!, en: e.target.value },
                        }))
                      }
                      dir="ltr"
                      placeholder={t("galleries.captionEnPlaceholder")}
                      disabled={!canUpdate}
                    />
                  </div>
                  {canUpdate && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => move(idx, -1)}
                          disabled={idx === 0}
                          className="rounded border border-spo-line px-2 py-1 text-xs text-spo-ink hover:bg-spo-paper disabled:opacity-40"
                          aria-label={t("galleries.moveUp")}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => move(idx, 1)}
                          disabled={idx === items.length - 1}
                          className="rounded border border-spo-line px-2 py-1 text-xs text-spo-ink hover:bg-spo-paper disabled:opacity-40"
                          aria-label={t("galleries.moveDown")}
                        >
                          ↓
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => saveCaption(item)}
                        >
                          {t("galleries.saveCaption")}
                        </Button>
                        <button
                          type="button"
                          onClick={() => setRemoving(item)}
                          className="text-sm text-spo-danger hover:underline"
                        >
                          {t("common.remove")}
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmModal
        open={!!removing}
        title={t("galleries.removeItemTitle")}
        description={t("galleries.removeItemBody")}
        confirmLabel={t("common.remove")}
        cancelLabel={t("common.cancel")}
        intent="danger"
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          const res = await removeGalleryItem({ id: removing.id });
          if (res.ok) {
            toast.push({
              tone: "success",
              title: t("galleries.toast.itemRemoved"),
            });
            setRemoving(null);
            refresh();
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
