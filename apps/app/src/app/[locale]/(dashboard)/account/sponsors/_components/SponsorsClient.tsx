"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Image as ImageIcon, Plus } from "lucide-react";

import {
  Badge,
  Button,
  Drawer,
  EmptyTableRow,
  FileUpload,
  FormGroup,
  Input,
  RowActions,
  Select,
  Switch,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import {
  createSponsor,
  deleteSponsor,
  updateSponsor,
  uploadSponsorLogo,
} from "../actions";

export type SponsorRow = {
  id: string;
  name_ar: string;
  name_en: string;
  tier: "strategic" | "main" | "official" | "supporter";
  logo_path: string | null;
  logo_url: string | null;
  url: string | null;
  display_order: number;
  active: boolean;
};

const TIERS: ReadonlyArray<SponsorRow["tier"]> = [
  "strategic",
  "main",
  "official",
  "supporter",
];

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; row: SponsorRow };

export function SponsorsClient({
  sponsors,
  locale,
}: {
  sponsors: SponsorRow[];
  locale: "ar" | "en";
}) {
  const t = useTranslations("sponsors");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });

  async function remove(id: string) {
    const res = await deleteSponsor({ id });
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.deleted") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.failed"), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("title")}</h2>
          <p className="text-sm text-spo-muted">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
          <Plus className="size-4 me-1.5" aria-hidden="true" />
          {t("add")}
        </Button>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("headers.logo")}</TH>
            <TH>{t("headers.name")}</TH>
            <TH>{t("headers.tier")}</TH>
            <TH>{t("headers.url")}</TH>
            <TH>{t("headers.order")}</TH>
            <TH>{t("headers.status")}</TH>
            <th className="px-4 py-3 text-end text-[11px] font-semibold text-spo-muted">
              {t("headers.actions")}
            </th>
          </TR>
        </THead>
        <TBody>
          {sponsors.length === 0 ? (
            <EmptyTableRow colSpan={7}>{t("empty")}</EmptyTableRow>
          ) : (
            sponsors.map((s) => (
              <TR key={s.id}>
                <TD>
                  <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-spo-line bg-white">
                    {s.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.logo_url}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="size-4 text-spo-muted" aria-hidden="true" />
                    )}
                  </span>
                </TD>
                <TD className="font-medium">
                  {locale === "ar" ? s.name_ar : s.name_en}
                </TD>
                <TD>
                  <Badge tone={s.tier === "strategic" ? "green" : s.tier === "main" ? "blue" : "neutral"}>
                    {t(`tiers.${s.tier}`)}
                  </Badge>
                </TD>
                <TD className="truncate text-xs text-spo-muted" dir="ltr">
                  {s.url ?? "—"}
                </TD>
                <TD>{s.display_order}</TD>
                <TD>
                  {s.active ? (
                    <Badge tone="green">{t("statuses.active")}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("statuses.inactive")}</Badge>
                  )}
                </TD>
                <TD className="text-end">
                  <RowActions
                    label={t("headers.actions")}
                    actions={[
                      {
                        key: "edit",
                        label: t("actions.edit"),
                        onSelect: () => setDrawer({ open: true, mode: "edit", row: s }),
                      },
                      {
                        key: "delete",
                        label: t("actions.delete"),
                        danger: true,
                        separator: true,
                        onSelect: () => remove(s.id),
                      },
                    ]}
                  />
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <SponsorDrawer
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

function SponsorDrawer({
  state,
  onClose,
  onSaved,
}: {
  state: DrawerState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("sponsors");
  const toast = useToast();
  const isEdit = state.open && state.mode === "edit";
  const editing = state.open && state.mode === "edit" ? state.row : null;

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [tier, setTier] = useState<SponsorRow["tier"]>("official");
  const [url, setUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const key = !state.open ? "closed" : state.mode === "create" ? "create" : `edit:${state.row.id}`;
  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "create") {
      setNameAr("");
      setNameEn("");
      setTier("official");
      setUrl("");
      setDisplayOrder("0");
      setActive(true);
    } else {
      setNameAr(state.row.name_ar);
      setNameEn(state.row.name_en);
      setTier(state.row.tier);
      setUrl(state.row.url ?? "");
      setDisplayOrder(String(state.row.display_order));
      setActive(state.row.active);
    }
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const payload = {
      name_ar: nameAr,
      name_en: nameEn,
      tier,
      url: url || undefined,
      display_order: Number(displayOrder) || 0,
      active,
    };
    const res =
      isEdit && editing
        ? await updateSponsor({ id: editing.id, ...payload })
        : await createSponsor(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: isEdit ? t("toast.updated") : t("toast.added") });
      onSaved();
    } else {
      setErr(res.error);
      toast.push({ tone: "error", title: t("toast.failed") });
    }
  }

  async function onLogo(file: File) {
    if (!editing) {
      toast.push({ tone: "error", title: t("toast.saveFirst") });
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.set("sponsor_id", editing.id);
    form.set("logo", file);
    const res = await uploadSponsorLogo(form);
    setUploading(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.logoUploaded") });
      onSaved();
    } else {
      toast.push({ tone: "error", title: t("toast.failed"), description: res.error });
    }
  }

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={isEdit ? t("drawer.editTitle") : t("drawer.createTitle")}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("fields.nameAr")} required>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" required />
          </FormGroup>
          <FormGroup label={t("fields.nameEn")} required>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" required />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("fields.tier")} required>
            <Select value={tier} onChange={(e) => setTier(e.target.value as SponsorRow["tier"])}>
              {TIERS.map((tr) => (
                <option key={tr} value={tr}>
                  {t(`tiers.${tr}`)}
                </option>
              ))}
            </Select>
          </FormGroup>
          <FormGroup label={t("fields.displayOrder")}>
            <Input
              type="number"
              min={0}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
        </div>
        <FormGroup label={t("fields.url")} hint={t("fields.urlHint")}>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} dir="ltr" placeholder="https://" />
        </FormGroup>

        {isEdit && editing && (
          <FormGroup label={t("fields.logo")} hint={t("fields.logoHint")}>
            <div className="flex items-center gap-3">
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-spo-line bg-white">
                {editing.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={editing.logo_url} alt="" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon className="size-5 text-spo-muted" aria-hidden="true" />
                )}
              </span>
              <div className="flex-1">
                <FileUpload
                  onFile={onLogo}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  disabled={uploading}
                  label={t("fields.logoUpload")}
                  hint={t("fields.logoFormats")}
                />
              </div>
            </div>
          </FormGroup>
        )}

        <Switch checked={active} onChange={setActive} label={t("fields.active")} />

        {err && <p className="text-sm text-spo-danger">{err}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting} type="button">
            {t("drawer.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t("drawer.saving") : isEdit ? t("drawer.save") : t("drawer.create")}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
