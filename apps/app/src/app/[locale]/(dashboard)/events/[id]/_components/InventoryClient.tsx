"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import {
  Button,
  ConfirmModal,
  Drawer,
  EmptyTableRow,
  FormGroup,
  Input,
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
  createSectionWithSeats,
  deleteSection,
  setSectionPricing,
} from "../../actions";

export type SectionRow = {
  id: string;
  label: string;
  rows_count: number;
  seats_per_row: number;
  capacity: number;
  pricing_label: string | null;
  price_sar: number | null;
  member_price_sar: number | null;
};

export function InventoryClient({
  fixtureId,
  sections,
  locale,
}: {
  fixtureId: string;
  sections: SectionRow[];
  locale: "ar" | "en";
}) {
  const t = useTranslations("events");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState<SectionRow | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-spo-ink">
          {t("sections.title")}
        </h3>
        <Button onClick={() => setAddOpen(true)}>{t("sections.add")}</Button>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("sections.headers.label")}</TH>
            <TH>{t("sections.headers.size")}</TH>
            <TH>{t("sections.headers.capacity")}</TH>
            <TH>{t("pricing.headers.label")}</TH>
            <TH>{t("pricing.headers.price")}</TH>
            <TH>{t("pricing.headers.memberPrice")}</TH>
            <TH>{t("pricing.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {sections.length === 0 ? (
            <EmptyTableRow colSpan={7}>{t("sections.empty")}</EmptyTableRow>
          ) : (
            sections.map((s) => (
              <SectionRowEditor
                key={s.id}
                section={s}
                fixtureId={fixtureId}
                onSaved={() => startTransition(() => router.refresh())}
                onDeleteRequested={() => setDeleting(s)}
                locale={locale}
              />
            ))
          )}
        </TBody>
      </Table>

      {addOpen && (
        <AddSectionDrawer
          fixtureId={fixtureId}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            startTransition(() => router.refresh());
          }}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        title={t("sections.remove")}
        description={deleting?.label ?? ""}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        intent="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteSection({ id: deleting.id });
          if (res.ok) {
            toast.push({ tone: "success", title: t("toast.sectionRemoved") });
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

function SectionRowEditor({
  section,
  fixtureId,
  onSaved,
  onDeleteRequested,
  locale,
}: {
  section: SectionRow;
  fixtureId: string;
  onSaved: () => void;
  onDeleteRequested: () => void;
  locale: "ar" | "en";
}) {
  const t = useTranslations("events");
  const toast = useToast();
  const [label, setLabel] = useState(section.pricing_label ?? section.label);
  const [price, setPrice] = useState(
    section.price_sar != null ? String(section.price_sar) : "0",
  );
  const [memberPrice, setMemberPrice] = useState(
    section.member_price_sar != null ? String(section.member_price_sar) : "",
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await setSectionPricing({
      fixture_id: fixtureId,
      section_id: section.id,
      label,
      price_sar: Number(price),
      member_price_sar: memberPrice === "" ? undefined : Number(memberPrice),
    });
    setSaving(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.pricingSaved") });
      onSaved();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  // Just for locale-aware number display
  void locale;

  return (
    <TR>
      <TD className="font-medium">{section.label}</TD>
      <TD className="text-xs text-spo-muted">
        {section.rows_count} × {section.seats_per_row}
      </TD>
      <TD>{section.capacity}</TD>
      <TD>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-9" />
      </TD>
      <TD>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          dir="ltr"
          className="h-9 w-28"
        />
      </TD>
      <TD>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={memberPrice}
          onChange={(e) => setMemberPrice(e.target.value)}
          dir="ltr"
          className="h-9 w-28"
        />
      </TD>
      <TD className="space-x-2 rtl:space-x-reverse">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-sm text-spo-green-deep hover:underline"
        >
          {t("common.save")}
        </button>
        <button
          type="button"
          onClick={onDeleteRequested}
          className="text-sm text-spo-danger hover:underline"
        >
          {t("sections.remove")}
        </button>
      </TD>
    </TR>
  );
}

function AddSectionDrawer({
  fixtureId,
  onClose,
  onSaved,
}: {
  fixtureId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("events");
  const toast = useToast();
  const [label, setLabel] = useState("");
  const [rows, setRows] = useState("10");
  const [seats, setSeats] = useState("20");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const res = await createSectionWithSeats({
      fixture_id: fixtureId,
      label: label.trim(),
      rows_count: Number(rows),
      seats_per_row: Number(seats),
      display_order: 0,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.sectionAdded") });
      onSaved();
    } else {
      if (res.error === "label-exists") setErr(t("sections.errors.labelExists"));
      else setErr(res.error);
      toast.push({ tone: "error", title: t("toast.saveFailed") });
    }
  }

  return (
    <Drawer open onClose={onClose} title={t("sections.form.title")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormGroup label={t("sections.form.label")} required>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} required />
        </FormGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("sections.form.rows")} required>
            <Input
              type="number"
              min={1}
              max={200}
              value={rows}
              onChange={(e) => setRows(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
          <FormGroup label={t("sections.form.seatsPerRow")} required>
            <Input
              type="number"
              min={1}
              max={200}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
        </div>
        {err && <p className="text-sm text-spo-danger">{err}</p>}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {t("common.create")}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
