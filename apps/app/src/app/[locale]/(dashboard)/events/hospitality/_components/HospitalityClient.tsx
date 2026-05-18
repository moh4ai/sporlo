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
  FileUpload,
  FormGroup,
  Input,
  Select,
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

import {
  createHospitalityPackage,
  deleteHospitalityPackage,
  updateHospitalityPackage,
  uploadHospitalityCover,
} from "../../actions";

export type FixtureFilter = "all" | "season" | "specific";

export type PackageRow = {
  id: string;
  name_ar: string;
  name_en: string;
  body_ar: string;
  body_en: string;
  price_sar: number;
  capacity: number | null;
  cover_image_path: string | null;
  cover_url: string | null;
  fixture_filter: FixtureFilter;
  contact_url: string;
  display_order: number;
  active: boolean;
};

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; pkg: PackageRow };

export function HospitalityClient({
  packages,
  principal,
  locale,
}: {
  packages: PackageRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("hospitality");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canCreate = useMemo(
    () => canPerform(principal, "create", "hospitality_package"),
    [principal],
  );
  const canUpdate = useMemo(
    () => canPerform(principal, "update", "hospitality_package"),
    [principal],
  );
  const canDelete = useMemo(
    () => canPerform(principal, "delete", "hospitality_package"),
    [principal],
  );
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });
  const [deleting, setDeleting] = useState<PackageRow | null>(null);

  const sarFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        style: "currency",
        currency: "SAR",
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("admin.title")}</h2>
          <p className="text-sm text-spo-muted">{t("admin.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
            {t("admin.newPackage")}
          </Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("admin.headers.name")}</TH>
            <TH>{t("admin.headers.price")}</TH>
            <TH>{t("admin.headers.capacity")}</TH>
            <TH>{t("admin.headers.filter")}</TH>
            <TH>{t("admin.headers.status")}</TH>
            <TH>{t("admin.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {packages.length === 0 ? (
            <EmptyTableRow colSpan={6}>{t("admin.empty")}</EmptyTableRow>
          ) : (
            packages.map((p) => (
              <TR key={p.id}>
                <TD className="font-medium">
                  {locale === "ar" ? p.name_ar : p.name_en}
                </TD>
                <TD>{sarFmt.format(p.price_sar)}</TD>
                <TD>{p.capacity ?? "—"}</TD>
                <TD>
                  <Badge tone="neutral">{t(`filter.${p.fixture_filter}`)}</Badge>
                </TD>
                <TD>
                  {p.active ? (
                    <Badge tone="green">{t("common.active")}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("common.inactive")}</Badge>
                  )}
                </TD>
                <TD className="space-x-2 rtl:space-x-reverse">
                  {canUpdate && (
                    <button
                      type="button"
                      onClick={() =>
                        setDrawer({ open: true, mode: "edit", pkg: p })
                      }
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

      <PackageFormDrawer
        state={drawer}
        onClose={() => setDrawer({ open: false })}
        onSaved={() => {
          setDrawer({ open: false });
          refresh();
        }}
      />

      <ConfirmModal
        open={!!deleting}
        title={t("common.delete")}
        description={
          deleting
            ? locale === "ar"
              ? deleting.name_ar
              : deleting.name_en
            : ""
        }
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        intent="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteHospitalityPackage({ id: deleting.id });
          if (res.ok) {
            toast.push({ tone: "success", title: t("admin.toast.deleted") });
            setDeleting(null);
            refresh();
          } else {
            toast.push({
              tone: "error",
              title: t("admin.toast.saveFailed"),
              description: res.error,
            });
          }
        }}
      />
    </div>
  );
}

function PackageFormDrawer({
  state,
  onClose,
  onSaved,
}: {
  state: DrawerState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("hospitality");
  const toast = useToast();
  const isEdit = state.open && state.mode === "edit";
  const editing = state.open && state.mode === "edit" ? state.pkg : null;

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [price, setPrice] = useState("0");
  const [capacity, setCapacity] = useState("");
  const [filter, setFilter] = useState<FixtureFilter>("all");
  const [contact, setContact] = useState("");
  const [order, setOrder] = useState("0");
  const [active, setActive] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const key = !state.open
    ? "closed"
    : state.mode === "create"
      ? "create"
      : `edit:${state.pkg.id}`;
  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "create") {
      setNameAr("");
      setNameEn("");
      setBodyAr("");
      setBodyEn("");
      setPrice("0");
      setCapacity("");
      setFilter("all");
      setContact("");
      setOrder("0");
      setActive(true);
      setCoverUrl(null);
    } else {
      setNameAr(state.pkg.name_ar);
      setNameEn(state.pkg.name_en);
      setBodyAr(state.pkg.body_ar);
      setBodyEn(state.pkg.body_en);
      setPrice(String(state.pkg.price_sar));
      setCapacity(state.pkg.capacity != null ? String(state.pkg.capacity) : "");
      setFilter(state.pkg.fixture_filter);
      setContact(state.pkg.contact_url);
      setOrder(String(state.pkg.display_order));
      setActive(state.pkg.active);
      setCoverUrl(state.pkg.cover_url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      name_ar: nameAr.trim(),
      name_en: nameEn.trim(),
      body_ar: bodyAr,
      body_en: bodyEn,
      price_sar: Number(price) || 0,
      capacity: capacity === "" ? undefined : Number(capacity),
      cover_image_path: undefined,
      fixture_filter: filter,
      contact_url: contact,
      display_order: Number(order) || 0,
      active,
    };
    const res =
      isEdit && editing
        ? await updateHospitalityPackage({ id: editing.id, ...payload })
        : await createHospitalityPackage(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({
        tone: "success",
        title: isEdit
          ? t("admin.toast.updated")
          : t("admin.toast.created"),
      });
      onSaved();
    } else {
      toast.push({
        tone: "error",
        title: t("admin.toast.saveFailed"),
        description: res.error,
      });
    }
  }

  async function handleCoverUpload(file: File) {
    if (!editing) {
      toast.push({
        tone: "error",
        title: t("admin.toast.saveFirst"),
        description: t("admin.toast.saveFirstHint"),
      });
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("package_id", editing.id);
    fd.append("cover", file);
    const res = await uploadHospitalityCover(fd);
    setUploading(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("admin.toast.coverUpdated") });
      onSaved();
    } else {
      toast.push({
        tone: "error",
        title: t("admin.toast.saveFailed"),
        description: res.error,
      });
    }
  }

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={
        isEdit ? t("admin.form.editTitle") : t("admin.form.createTitle")
      }
      widthClassName="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("admin.form.nameAr")} required>
            <Input
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              dir="rtl"
              required
            />
          </FormGroup>
          <FormGroup label={t("admin.form.nameEn")} required>
            <Input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("admin.form.bodyAr")}>
            <Textarea
              rows={3}
              value={bodyAr}
              onChange={(e) => setBodyAr(e.target.value)}
              dir="rtl"
            />
          </FormGroup>
          <FormGroup label={t("admin.form.bodyEn")}>
            <Textarea
              rows={3}
              value={bodyEn}
              onChange={(e) => setBodyEn(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormGroup label={t("admin.form.priceSar")} required>
            <Input
              type="number"
              min={0}
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
          <FormGroup
            label={t("admin.form.capacity")}
            hint={t("admin.form.capacityHint")}
          >
            <Input
              type="number"
              min={1}
              max={10000}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
          <FormGroup label={t("admin.form.displayOrder")}>
            <Input
              type="number"
              min={0}
              max={9999}
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("admin.form.filter")} hint={t("admin.form.filterHint")}>
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FixtureFilter)}
            >
              <option value="all">{t("filter.all")}</option>
              <option value="season">{t("filter.season")}</option>
              <option value="specific">{t("filter.specific")}</option>
            </Select>
          </FormGroup>
          <FormGroup
            label={t("admin.form.contactUrl")}
            hint={t("admin.form.contactUrlHint")}
          >
            <Input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              dir="ltr"
              placeholder="https://"
            />
          </FormGroup>
        </div>
        <Switch
          checked={active}
          onChange={setActive}
          label={t("admin.form.active")}
        />

        {isEdit && editing && (
          <div className="space-y-2 rounded-card border border-spo-line bg-spo-paper/40 p-3">
            <h3 className="text-sm font-medium text-spo-ink">
              {t("admin.form.cover")}
            </h3>
            {coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt=""
                className="aspect-[16/9] w-full rounded-card object-cover"
              />
            )}
            <FileUpload
              label={t("admin.form.coverLabel")}
              hint={t("admin.form.coverHint")}
              accept="image/png,image/jpeg,image/webp"
              disabled={uploading}
              onFile={handleCoverUpload}
            />
          </div>
        )}

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
