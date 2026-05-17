"use client";

import Image from "next/image";
import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  FileUpload,
  FormGroup,
  Input,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import {
  archiveOrganization,
  unarchiveOrganization,
  updateOrganization,
  uploadOrgLogo,
} from "../actions";

export type OrgRow = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  tagline_ar: string | null;
  tagline_en: string | null;
  subdomain: string | null;
  custom_domain: string | null;
  primary_color: string | null;
  logo_path: string | null;
  tier: string | null;
  subscription_tier: string;
  archived_at: string | null;
};

export function AccountForm({
  org,
  logoUrl,
  canEdit,
  locale,
}: {
  org: OrgRow;
  logoUrl: string | null;
  canEdit: boolean;
  locale: "ar" | "en";
}) {
  const t = useTranslations("account");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [nameAr, setNameAr] = useState(org.name_ar);
  const [nameEn, setNameEn] = useState(org.name_en);
  const [taglineAr, setTaglineAr] = useState(org.tagline_ar ?? "");
  const [taglineEn, setTaglineEn] = useState(org.tagline_en ?? "");
  const [subdomain, setSubdomain] = useState(org.subdomain ?? "");
  const [customDomain, setCustomDomain] = useState(org.custom_domain ?? "");
  const [primaryColor, setPrimaryColor] = useState(org.primary_color ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [fieldErr, setFieldErr] = useState<{ field?: string; message: string } | null>(null);

  const archived = Boolean(org.archived_at);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFieldErr(null);
    const res = await updateOrganization({
      name_ar: nameAr.trim(),
      name_en: nameEn.trim(),
      tagline_ar: taglineAr,
      tagline_en: taglineEn,
      subdomain,
      custom_domain: customDomain,
      primary_color: primaryColor,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.saved") });
      startTransition(() => router.refresh());
    } else {
      const message = res.error === "already-taken"
        ? t("errors.alreadyTaken")
        : res.error === "invalid"
          ? t("errors.invalid")
          : res.error;
      setFieldErr({ field: res.field, message });
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: message });
    }
  }

  async function onLogo(file: File) {
    setUploading(true);
    const form = new FormData();
    form.set("logo", file);
    const res = await uploadOrgLogo(form);
    setUploading(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.logoUploaded") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  async function confirmArchive() {
    setArchiving(true);
    const res = archived ? await unarchiveOrganization() : await archiveOrganization();
    setArchiving(false);
    setShowArchive(false);
    if (res.ok) {
      toast.push({
        tone: "success",
        title: archived ? t("toast.unarchived") : t("toast.archived"),
      });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {archived && (
        <Card variant="warm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-medium text-spo-warning">{t("archived.title")}</div>
              <p className="mt-1 text-sm text-spo-muted">{t("archived.description")}</p>
            </div>
            {canEdit && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowArchive(true)}
                disabled={archiving}
              >
                {t("archived.unarchive")}
              </Button>
            )}
          </div>
        </Card>
      )}

      <Card>
        <div className="space-y-4">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-spo-ink">{t("sections.identity")}</h2>
            <p className="text-sm text-spo-muted">{t("sections.identityHint")}</p>
          </header>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup
              label={t("fields.nameAr")}
              required
              error={fieldErr?.field === "name_ar" ? fieldErr.message : undefined}
            >
              <Input
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                dir="rtl"
                required
                disabled={!canEdit}
              />
            </FormGroup>
            <FormGroup
              label={t("fields.nameEn")}
              required
              error={fieldErr?.field === "name_en" ? fieldErr.message : undefined}
            >
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                dir="ltr"
                required
                disabled={!canEdit}
              />
            </FormGroup>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup label={t("fields.taglineAr")}>
              <Input
                value={taglineAr}
                onChange={(e) => setTaglineAr(e.target.value)}
                dir="rtl"
                disabled={!canEdit}
              />
            </FormGroup>
            <FormGroup label={t("fields.taglineEn")}>
              <Input
                value={taglineEn}
                onChange={(e) => setTaglineEn(e.target.value)}
                dir="ltr"
                disabled={!canEdit}
              />
            </FormGroup>
          </div>

          <div className="text-xs text-spo-muted">
            <span className="font-medium text-spo-ink-2">{t("fields.slug")}:</span>{" "}
            <code className="rounded bg-spo-paper px-1.5 py-0.5">{org.slug}</code>
            {" — "}
            {t("fields.slugHint")}
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-spo-ink">{t("sections.domain")}</h2>
            <p className="text-sm text-spo-muted">{t("sections.domainHint")}</p>
          </header>

          <FormGroup
            label={t("fields.subdomain")}
            hint={t("fields.subdomainHint")}
            error={fieldErr?.field === "subdomain" ? fieldErr.message : undefined}
          >
            <Input
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
              dir="ltr"
              placeholder="my-club"
              disabled={!canEdit}
            />
          </FormGroup>

          <FormGroup
            label={t("fields.customDomain")}
            hint={t("fields.customDomainHint")}
            error={fieldErr?.field === "custom_domain" ? fieldErr.message : undefined}
          >
            <Input
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
              dir="ltr"
              placeholder="club.example.com"
              disabled={!canEdit}
            />
          </FormGroup>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-spo-ink">{t("sections.branding")}</h2>
            <p className="text-sm text-spo-muted">{t("sections.brandingHint")}</p>
          </header>

          <div className="grid gap-4 sm:grid-cols-[160px_1fr] sm:items-start">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-card border border-spo-line bg-white">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={locale === "ar" ? org.name_ar : org.name_en}
                  width={128}
                  height={128}
                  className="h-full w-full object-contain"
                  unoptimized
                />
              ) : (
                <span className="text-xs text-spo-muted">{t("fields.logoEmpty")}</span>
              )}
            </div>
            <FileUpload
              onFile={onLogo}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={!canEdit || uploading}
              label={t("fields.logoUpload")}
              hint={t("fields.logoHint")}
            />
          </div>

          <FormGroup
            label={t("fields.primaryColor")}
            hint={t("fields.primaryColorHint")}
            error={fieldErr?.field === "primary_color" ? fieldErr.message : undefined}
          >
            <div className="flex items-center gap-3">
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                dir="ltr"
                placeholder="#0a5d3c"
                className="max-w-[200px]"
                disabled={!canEdit}
              />
              <span
                className="h-9 w-9 rounded-md border border-spo-line"
                style={{ backgroundColor: primaryColor || "transparent" }}
                aria-hidden="true"
              />
            </div>
          </FormGroup>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-spo-ink">{t("sections.plan")}</h2>
            <p className="text-sm text-spo-muted">{t("sections.planHint")}</p>
          </header>

          <div className="flex flex-wrap items-center gap-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-spo-muted">
                {t("fields.tier")}
              </div>
              <div className="mt-1">
                <Badge tone="neutral">{(org.tier ?? "—").toUpperCase()}</Badge>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-spo-muted">
                {t("fields.subscriptionTier")}
              </div>
              <div className="mt-1">
                <Badge tone="green">{org.subscription_tier}</Badge>
              </div>
            </div>
          </div>
          <p className="text-xs text-spo-muted">{t("sections.planManagedBy")}</p>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={!canEdit || submitting}>
          {submitting ? t("actions.saving") : t("actions.save")}
        </Button>
      </div>

      {!archived && canEdit && (
        <Card variant="warm">
          <div className="space-y-3">
            <header className="space-y-1">
              <h2 className="text-lg font-semibold text-spo-danger">{t("danger.title")}</h2>
              <p className="text-sm text-spo-muted">{t("danger.description")}</p>
            </header>
            <Button
              type="button"
              variant="danger"
              onClick={() => setShowArchive(true)}
              disabled={archiving}
            >
              {t("danger.archive")}
            </Button>
          </div>
        </Card>
      )}

      <ConfirmModal
        open={showArchive}
        title={archived ? t("confirm.unarchiveTitle") : t("confirm.archiveTitle")}
        description={archived ? t("confirm.unarchiveBody") : t("confirm.archiveBody")}
        confirmLabel={archived ? t("archived.unarchive") : t("danger.archive")}
        cancelLabel={t("confirm.cancel")}
        intent={archived ? "primary" : "danger"}
        onConfirm={confirmArchive}
        onCancel={() => setShowArchive(false)}
      />
    </form>
  );
}
