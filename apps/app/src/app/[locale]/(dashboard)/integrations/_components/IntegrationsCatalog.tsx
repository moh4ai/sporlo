"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import type {
  IntegrationCategory,
  IntegrationKind,
} from "@sporlo/integrations";
import { Badge, Button, Input } from "@sporlo/ui";

import { Link } from "@/i18n/navigation";

import { IntegrationLogo } from "./IntegrationLogo";
import { RequestIntegrationModal } from "./RequestIntegrationModal";

export type CatalogEntryProps = {
  slug: string;
  name_ar: string;
  name_en: string;
  category: IntegrationCategory;
  short_description_ar: string;
  short_description_en: string;
  kinds: ReadonlyArray<IntegrationKind>;
  availability: "available" | "coming_soon";
  simple_icon: string | null;
  brand_color: string;
};

const CATEGORY_ORDER: IntegrationCategory[] = [
  "communications",
  "productivity",
  "marketing",
  "analytics",
  "payments",
  "sports",
  "social",
  "support",
  "automation",
];

type Filter = "all" | "installed" | IntegrationCategory;

export function IntegrationsCatalog({
  entries,
  installedSlugs,
  pendingRequestSlugs,
  locale,
}: {
  entries: CatalogEntryProps[];
  installedSlugs: string[];
  pendingRequestSlugs: string[];
  locale: "ar" | "en";
}) {
  const t = useTranslations("integrations");
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [requestingSlug, setRequestingSlug] = useState<string | null>(null);

  const installed = useMemo(() => new Set(installedSlugs), [installedSlugs]);
  const pending = useMemo(() => new Set(pendingRequestSlugs), [pendingRequestSlugs]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter === "installed" && !installed.has(e.slug)) return false;
      if (filter !== "all" && filter !== "installed" && e.category !== filter) {
        return false;
      }
      if (term) {
        const hay = `${e.name_en} ${e.name_ar} ${e.short_description_en}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [entries, filter, q, installed]);

  // Counts per filter for the chip badges.
  const counts = useMemo(() => {
    const byCat = new Map<Filter, number>();
    byCat.set("all", entries.length);
    byCat.set("installed", entries.filter((e) => installed.has(e.slug)).length);
    for (const c of CATEGORY_ORDER) {
      byCat.set(c, entries.filter((e) => e.category === c).length);
    }
    return byCat;
  }, [entries, installed]);

  return (
    <div className="space-y-6">
      {/* Filter row */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            label={t("filters.all")}
            count={counts.get("all") ?? 0}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <FilterChip
            label={t("filters.installed")}
            count={counts.get("installed") ?? 0}
            active={filter === "installed"}
            onClick={() => setFilter("installed")}
          />
          {CATEGORY_ORDER.map((c) => (
            <FilterChip
              key={c}
              label={t(`categories.${c}`)}
              count={counts.get(c) ?? 0}
              active={filter === c}
              onClick={() => setFilter(c)}
            />
          ))}
        </div>
        <div className="relative max-w-md">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-spo-muted"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="ps-9"
            aria-label={t("searchPlaceholder")}
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="rounded-card border border-dashed border-spo-line bg-white p-10 text-center text-sm text-spo-muted">
          {t("emptyFiltered")}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => {
            const isInstalled = installed.has(entry.slug);
            const isPending = pending.has(entry.slug);
            const status: "installed" | "available" | "comingSoon" = isInstalled
              ? "installed"
              : entry.availability === "available"
                ? "available"
                : "comingSoon";
            return (
              <li key={entry.slug}>
                <article
                  className="group flex h-full flex-col gap-3 rounded-card border border-spo-line bg-white p-4 transition-all hover:border-spo-green/40 hover:shadow-[var(--shadow-2)]"
                  style={{
                    borderTopColor: `#${entry.brand_color}`,
                    borderTopWidth: 3,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <IntegrationLogo
                      name={locale === "ar" ? entry.name_ar : entry.name_en}
                      simpleIcon={entry.simple_icon}
                      brandColor={entry.brand_color}
                    />
                    <StatusBadge status={status} t={t} />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="text-base font-semibold text-spo-ink">
                      {locale === "ar" ? entry.name_ar : entry.name_en}
                    </h3>
                    <p className="line-clamp-3 text-sm text-spo-muted">
                      {locale === "ar"
                        ? entry.short_description_ar
                        : entry.short_description_en}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-spo-muted">
                      {t(`categories.${entry.category}`)}
                    </span>
                    {status === "comingSoon" ? (
                      isPending ? (
                        <span className="inline-flex items-center text-xs font-medium text-spo-green-deep">
                          ✓ {t("request.alreadyRequested")}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setRequestingSlug(entry.slug)}
                        >
                          {t("request.button")}
                        </Button>
                      )
                    ) : (
                      <Link
                        href={`/integrations/${entry.slug}`}
                        className="text-sm font-medium text-spo-green-deep hover:underline"
                      >
                        {status === "installed"
                          ? t("actions.configure")
                          : t("actions.install")} →
                      </Link>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <RequestIntegrationModal
        slug={requestingSlug}
        entries={entries}
        locale={locale}
        onClose={() => setRequestingSlug(null)}
      />
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-sm transition-colors " +
        (active
          ? "border-spo-green bg-spo-green text-white"
          : "border-spo-line bg-white text-spo-ink-2 hover:bg-spo-paper")
      }
    >
      <span>{label}</span>
      <span
        className={
          "rounded-pill px-1.5 text-[11px] font-semibold " +
          (active ? "bg-white/20" : "bg-spo-paper text-spo-muted")
        }
      >
        {count}
      </span>
    </button>
  );
}

function StatusBadge({
  status,
  t,
}: {
  status: "installed" | "available" | "comingSoon";
  t: ReturnType<typeof useTranslations>;
}) {
  if (status === "installed") return <Badge tone="green">{t("status.installed")}</Badge>;
  if (status === "available") return <Badge tone="blue">{t("status.available")}</Badge>;
  return <Badge tone="neutral">{t("status.comingSoon")}</Badge>;
}
