"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button, Card, FormGroup, Input, Textarea, useToast } from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import { updateStadiumInfo } from "../actions";

export type StadiumRow = {
  name_ar: string | null;
  name_en: string | null;
  address_ar: string | null;
  address_en: string | null;
  city_ar: string | null;
  city_en: string | null;
  capacity: number | null;
  opened_year: number | null;
  map_lat: number | null;
  map_lng: number | null;
  parking_notes_ar: string | null;
  parking_notes_en: string | null;
  accessibility_notes_ar: string | null;
  accessibility_notes_en: string | null;
};

export function StadiumForm({ initial }: { initial: StadiumRow }) {
  const t = useTranslations("stadiumAdmin");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [form, setForm] = useState<Record<keyof StadiumRow, string>>(() => ({
    name_ar: initial.name_ar ?? "",
    name_en: initial.name_en ?? "",
    address_ar: initial.address_ar ?? "",
    address_en: initial.address_en ?? "",
    city_ar: initial.city_ar ?? "",
    city_en: initial.city_en ?? "",
    capacity: initial.capacity != null ? String(initial.capacity) : "",
    opened_year: initial.opened_year != null ? String(initial.opened_year) : "",
    map_lat: initial.map_lat != null ? String(initial.map_lat) : "",
    map_lng: initial.map_lng != null ? String(initial.map_lng) : "",
    parking_notes_ar: initial.parking_notes_ar ?? "",
    parking_notes_en: initial.parking_notes_en ?? "",
    accessibility_notes_ar: initial.accessibility_notes_ar ?? "",
    accessibility_notes_en: initial.accessibility_notes_en ?? "",
  }));
  const [saving, setSaving] = useState(false);

  function set<K extends keyof StadiumRow>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await updateStadiumInfo({
      name_ar: form.name_ar || null,
      name_en: form.name_en || null,
      address_ar: form.address_ar || null,
      address_en: form.address_en || null,
      city_ar: form.city_ar || null,
      city_en: form.city_en || null,
      capacity: form.capacity ? Number(form.capacity) : null,
      opened_year: form.opened_year ? Number(form.opened_year) : null,
      map_lat: form.map_lat ? Number(form.map_lat) : null,
      map_lng: form.map_lng ? Number(form.map_lng) : null,
      parking_notes_ar: form.parking_notes_ar || null,
      parking_notes_en: form.parking_notes_en || null,
      accessibility_notes_ar: form.accessibility_notes_ar || null,
      accessibility_notes_en: form.accessibility_notes_en || null,
    });
    setSaving(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.saved") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.failed"), description: res.error });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <div className="space-y-4">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-spo-ink">{t("sections.identity")}</h2>
            <p className="text-sm text-spo-muted">{t("sections.identityHint")}</p>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup label={t("fields.nameAr")}>
              <Input value={form.name_ar} onChange={(e) => set("name_ar", e.target.value)} dir="rtl" />
            </FormGroup>
            <FormGroup label={t("fields.nameEn")}>
              <Input value={form.name_en} onChange={(e) => set("name_en", e.target.value)} dir="ltr" />
            </FormGroup>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup label={t("fields.addressAr")}>
              <Input value={form.address_ar} onChange={(e) => set("address_ar", e.target.value)} dir="rtl" />
            </FormGroup>
            <FormGroup label={t("fields.addressEn")}>
              <Input value={form.address_en} onChange={(e) => set("address_en", e.target.value)} dir="ltr" />
            </FormGroup>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup label={t("fields.cityAr")}>
              <Input value={form.city_ar} onChange={(e) => set("city_ar", e.target.value)} dir="rtl" />
            </FormGroup>
            <FormGroup label={t("fields.cityEn")}>
              <Input value={form.city_en} onChange={(e) => set("city_en", e.target.value)} dir="ltr" />
            </FormGroup>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-spo-ink">{t("sections.stats")}</h2>
            <p className="text-sm text-spo-muted">{t("sections.statsHint")}</p>
          </header>
          <div className="grid gap-3 sm:grid-cols-4">
            <FormGroup label={t("fields.capacity")}>
              <Input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => set("capacity", e.target.value)}
                dir="ltr"
              />
            </FormGroup>
            <FormGroup label={t("fields.openedYear")}>
              <Input
                type="number"
                min={1800}
                max={2200}
                value={form.opened_year}
                onChange={(e) => set("opened_year", e.target.value)}
                dir="ltr"
              />
            </FormGroup>
            <FormGroup label={t("fields.mapLat")}>
              <Input
                type="number"
                step="0.000001"
                value={form.map_lat}
                onChange={(e) => set("map_lat", e.target.value)}
                dir="ltr"
              />
            </FormGroup>
            <FormGroup label={t("fields.mapLng")}>
              <Input
                type="number"
                step="0.000001"
                value={form.map_lng}
                onChange={(e) => set("map_lng", e.target.value)}
                dir="ltr"
              />
            </FormGroup>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-spo-ink">{t("sections.notes")}</h2>
            <p className="text-sm text-spo-muted">{t("sections.notesHint")}</p>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup label={t("fields.parkingAr")}>
              <Textarea
                rows={3}
                value={form.parking_notes_ar}
                onChange={(e) => set("parking_notes_ar", e.target.value)}
                dir="rtl"
              />
            </FormGroup>
            <FormGroup label={t("fields.parkingEn")}>
              <Textarea
                rows={3}
                value={form.parking_notes_en}
                onChange={(e) => set("parking_notes_en", e.target.value)}
                dir="ltr"
              />
            </FormGroup>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormGroup label={t("fields.accessibilityAr")}>
              <Textarea
                rows={3}
                value={form.accessibility_notes_ar}
                onChange={(e) => set("accessibility_notes_ar", e.target.value)}
                dir="rtl"
              />
            </FormGroup>
            <FormGroup label={t("fields.accessibilityEn")}>
              <Textarea
                rows={3}
                value={form.accessibility_notes_en}
                onChange={(e) => set("accessibility_notes_en", e.target.value)}
                dir="ltr"
              />
            </FormGroup>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? t("actions.saving") : t("actions.save")}
        </Button>
      </div>
    </form>
  );
}
