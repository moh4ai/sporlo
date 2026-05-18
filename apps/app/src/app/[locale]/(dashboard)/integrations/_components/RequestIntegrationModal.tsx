"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button, Modal, Textarea, useToast } from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import { requestIntegration } from "../actions";
import { IntegrationLogo } from "./IntegrationLogo";
import type { CatalogEntryProps } from "./IntegrationsCatalog";

export function RequestIntegrationModal({
  slug,
  entries,
  locale,
  onClose,
}: {
  slug: string | null;
  entries: CatalogEntryProps[];
  locale: "ar" | "en";
  onClose: () => void;
}) {
  const t = useTranslations("integrations");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const entry = slug ? entries.find((e) => e.slug === slug) ?? null : null;

  useEffect(() => {
    if (!slug) {
      setNotes("");
      setSubmitting(false);
    }
  }, [slug]);

  async function submit() {
    if (!slug) return;
    setSubmitting(true);
    const res = await requestIntegration({ slug, notes: notes || undefined });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("request.toastSuccess") });
      onClose();
      startTransition(() => router.refresh());
    } else {
      toast.push({
        tone: "error",
        title: t("request.toastFailed"),
        description: res.error,
      });
    }
  }

  return (
    <Modal open={entry !== null} onClose={onClose} title={t("request.modalTitle")}>
      {entry && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-card bg-spo-paper p-3">
            <IntegrationLogo
              name={locale === "ar" ? entry.name_ar : entry.name_en}
              simpleIcon={entry.simple_icon}
              brandColor={entry.brand_color}
              size="sm"
            />
            <div className="min-w-0">
              <div className="font-semibold text-spo-ink">
                {locale === "ar" ? entry.name_ar : entry.name_en}
              </div>
              <div className="line-clamp-1 text-xs text-spo-muted">
                {locale === "ar"
                  ? entry.short_description_ar
                  : entry.short_description_en}
              </div>
            </div>
          </div>

          <p className="text-sm text-spo-ink-2">{t("request.intro")}</p>

          <div>
            <label
              htmlFor="integration-request-notes"
              className="mb-1 block text-sm text-spo-ink-2"
            >
              {t("request.notesLabel")}
            </label>
            <Textarea
              id="integration-request-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("request.notesPlaceholder")}
              rows={4}
              maxLength={500}
            />
            <p className="mt-1 text-xs text-spo-muted">
              {notes.length}/500
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              {t("request.cancel")}
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? t("request.submitting") : t("request.submit")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
