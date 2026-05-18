"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  CalendarDays,
  ExternalLink,
  Globe,
  Handshake,
  Image as ImageIcon,
  Newspaper,
  ShoppingBag,
  Trophy,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button, Card, FormGroup, Select, useToast } from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import { updateFanPortalSettings } from "../actions";

export type CurrentSettings = {
  hero_enabled: boolean;
  next_match_enabled: boolean;
  news_enabled: boolean;
  squad_enabled: boolean;
  shop_enabled: boolean;
  about_enabled: boolean;
  match_center_enabled: boolean;
  honours_enabled: boolean;
  sponsors_enabled: boolean;
  featured_news_id: string | null;
  featured_product_id: string | null;
};

export type NewsOption = { id: string; title_ar: string; title_en: string };
export type ProductOption = { id: string; name_ar: string; name_en: string };

type SectionFlagKey =
  | "hero_enabled"
  | "next_match_enabled"
  | "match_center_enabled"
  | "news_enabled"
  | "squad_enabled"
  | "shop_enabled"
  | "honours_enabled"
  | "sponsors_enabled"
  | "about_enabled";

const SECTIONS: ReadonlyArray<{
  key: SectionFlagKey;
  labelKey: string;
  hintKey: string;
  icon: LucideIcon;
}> = [
  { key: "hero_enabled", labelKey: "sections.hero", hintKey: "sections.heroHint", icon: ImageIcon },
  { key: "next_match_enabled", labelKey: "sections.nextMatch", hintKey: "sections.nextMatchHint", icon: CalendarDays },
  { key: "match_center_enabled", labelKey: "sections.matchCenter", hintKey: "sections.matchCenterHint", icon: CalendarDays },
  { key: "news_enabled", labelKey: "sections.news", hintKey: "sections.newsHint", icon: Newspaper },
  { key: "squad_enabled", labelKey: "sections.squad", hintKey: "sections.squadHint", icon: Users },
  { key: "shop_enabled", labelKey: "sections.shop", hintKey: "sections.shopHint", icon: ShoppingBag },
  { key: "honours_enabled", labelKey: "sections.honours", hintKey: "sections.honoursHint", icon: Trophy },
  { key: "sponsors_enabled", labelKey: "sections.sponsors", hintKey: "sections.sponsorsHint", icon: Handshake },
  { key: "about_enabled", labelKey: "sections.about", hintKey: "sections.aboutHint", icon: Building2 },
];

export function FanPortalManager({
  current,
  newsOptions,
  productOptions,
  publicUrl,
  locale,
}: {
  current: CurrentSettings;
  newsOptions: NewsOption[];
  productOptions: ProductOption[];
  publicUrl: string;
  locale: "ar" | "en";
}) {
  const t = useTranslations("fansManager");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [form, setForm] = useState<CurrentSettings>(current);
  const [saving, setSaving] = useState(false);

  function setFlag(key: keyof CurrentSettings, value: boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await updateFanPortalSettings({
      hero_enabled: form.hero_enabled,
      next_match_enabled: form.next_match_enabled,
      news_enabled: form.news_enabled,
      squad_enabled: form.squad_enabled,
      shop_enabled: form.shop_enabled,
      about_enabled: form.about_enabled,
      match_center_enabled: form.match_center_enabled,
      honours_enabled: form.honours_enabled,
      sponsors_enabled: form.sponsors_enabled,
      featured_news_id: form.featured_news_id,
      featured_product_id: form.featured_product_id,
    });
    setSaving(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.saved") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.failed"), description: res.error });
    }
  }

  const newsLabel = (n: NewsOption) => (locale === "ar" ? n.title_ar : n.title_en);
  const productLabel = (p: ProductOption) => (locale === "ar" ? p.name_ar : p.name_en);

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Preview banner */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-md bg-spo-green-soft text-spo-green-deep">
              <Globe className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-spo-ink">{t("preview.title")}</p>
              <p className="text-xs text-spo-muted">{t("preview.subtitle")}</p>
            </div>
          </div>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-pill border border-spo-line bg-white px-3 py-1.5 text-sm text-spo-ink-2 transition-colors hover:bg-spo-paper"
          >
            {t("preview.open")}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </Card>

      {/* Section toggles */}
      <Card>
        <div className="space-y-4">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-spo-ink">{t("sections.title")}</h2>
            <p className="text-sm text-spo-muted">{t("sections.subtitle")}</p>
          </header>
          <ul className="divide-y divide-spo-line">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const enabled = form[section.key];
              return (
                <li key={section.key} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        "inline-flex size-9 items-center justify-center rounded-md " +
                        (enabled
                          ? "bg-spo-green-soft text-spo-green-deep"
                          : "bg-spo-paper text-spo-muted")
                      }
                    >
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-spo-ink">{t(section.labelKey)}</p>
                      <p className="text-xs text-spo-muted">{t(section.hintKey)}</p>
                    </div>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setFlag(section.key, e.target.checked)}
                      className="h-5 w-5 cursor-pointer accent-spo-green"
                    />
                    <span className="text-xs text-spo-muted">
                      {enabled ? t("sections.on") : t("sections.off")}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      </Card>

      {/* Featured pins */}
      <Card>
        <div className="space-y-4">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-spo-ink">{t("featured.title")}</h2>
            <p className="text-sm text-spo-muted">{t("featured.subtitle")}</p>
          </header>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormGroup label={t("featured.news")} hint={t("featured.newsHint")}>
              <Select
                value={form.featured_news_id ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, featured_news_id: e.target.value || null }))
                }
              >
                <option value="">{t("featured.noneLatest")}</option>
                {newsOptions.map((n) => (
                  <option key={n.id} value={n.id}>
                    {newsLabel(n)}
                  </option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup label={t("featured.product")} hint={t("featured.productHint")}>
              <Select
                value={form.featured_product_id ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, featured_product_id: e.target.value || null }))
                }
              >
                <option value="">{t("featured.noneLatest")}</option>
                {productOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {productLabel(p)}
                  </option>
                ))}
              </Select>
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
