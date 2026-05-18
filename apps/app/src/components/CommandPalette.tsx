"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  CalendarDays,
  FileText,
  Newspaper,
  Search,
  ShoppingBag,
  ShieldCheck,
  Tag,
  UserCog,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useRouter } from "@/i18n/navigation";

import type { SearchKind, SearchResult } from "@/app/api/search/route";

const KIND_ICON: Record<SearchKind, LucideIcon> = {
  member: Users,
  plan: Tag,
  product: ShoppingBag,
  fixture: CalendarDays,
  news_article: Newspaper,
  staff: UserCog,
  facility: Building2,
  squad: ShieldCheck,
};

const KIND_ORDER: SearchKind[] = [
  "member",
  "plan",
  "fixture",
  "product",
  "facility",
  "squad",
  "staff",
  "news_article",
];

const RECENT_KEY = "sporlo.cmdk.recent";
const MAX_RECENT = 6;

export function CommandPalette({ locale }: { locale: "ar" | "en" }) {
  const t = useTranslations("cmdk");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Cmd/Ctrl+K listener — only when the palette isn't open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Load recent searches when palette opens.
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw) as SearchResult[]);
    } catch {
      setRecent([]);
    }
    // Focus the input after the modal mounts.
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Debounced fetch.
  useEffect(() => {
    if (!open) return;
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setActiveIndex(0);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&locale=${locale}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) {
          setResults([]);
          return;
        }
        const json = (await res.json()) as { results: SearchResult[] };
        setResults(json.results ?? []);
        setActiveIndex(0);
      } catch {
        // ignore aborts
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [q, open, locale]);

  // What to show: results when query is present, else recent.
  const visible = q.trim().length >= 2 ? results : recent;

  // Group results by kind (preserving KIND_ORDER).
  const grouped = useMemo(() => {
    const byKind = new Map<SearchKind, SearchResult[]>();
    for (const r of visible) {
      const list = byKind.get(r.kind) ?? [];
      list.push(r);
      byKind.set(r.kind, list);
    }
    return KIND_ORDER.flatMap((kind) => {
      const items = byKind.get(kind);
      return items && items.length ? [{ kind, items }] : [];
    });
  }, [visible]);

  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  function close() {
    setOpen(false);
    setQ("");
    setResults([]);
    setActiveIndex(0);
  }

  function recordRecent(result: SearchResult) {
    const next = [result, ...recent.filter((r) => !(r.kind === result.kind && r.id === result.id))].slice(
      0,
      MAX_RECENT,
    );
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function follow(result: SearchResult) {
    recordRecent(result);
    close();
    router.push(result.href.replace(`/${locale}`, ""));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(flat.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const target = flat[activeIndex];
      if (target) follow(target);
    }
  }

  return (
    <>
      {/* Trigger button — replaces the stub in TopBar */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-pill border border-spo-line bg-spo-paper px-3 py-1.5 text-sm text-spo-muted transition-colors hover:text-spo-ink-2 md:inline-flex"
        aria-label={t("trigger")}
      >
        <Search className="size-3.5" />
        <span>{t("trigger")}</span>
        <kbd className="ms-1 rounded border border-spo-line bg-white px-1 text-[10px] font-medium text-spo-muted">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center bg-spo-ink/40 p-4 pt-[10vh]"
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-card-lg border border-spo-line bg-white shadow-[var(--shadow-3)]"
          >
            <div className="flex items-center gap-2 border-b border-spo-line px-4 py-3">
              <Search className="size-4 text-spo-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t("placeholder")}
                className="flex-1 bg-transparent text-sm text-spo-ink placeholder:text-spo-muted focus:outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              {loading && (
                <span className="text-xs text-spo-muted">{t("loading")}</span>
              )}
              <kbd className="rounded border border-spo-line bg-spo-paper px-1.5 py-0.5 text-[10px] font-medium text-spo-muted">
                Esc
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {grouped.length === 0 && q.trim().length >= 2 && !loading && (
                <div className="px-4 py-8 text-center text-sm text-spo-muted">
                  {t("empty")}
                </div>
              )}

              {grouped.length === 0 && q.trim().length < 2 && recent.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-spo-muted">
                  {t("hint")}
                </div>
              )}

              {grouped.map((group) => {
                const Icon = KIND_ICON[group.kind];
                return (
                  <div key={group.kind} className="py-1">
                    <div className="px-4 pt-2 text-[11px] font-semibold uppercase tracking-wider text-spo-muted">
                      {q.trim().length < 2 ? t("recentLabel") : t(`kinds.${group.kind}`)}
                    </div>
                    <ul>
                      {group.items.map((item) => {
                        const flatIdx = flat.indexOf(item);
                        const active = flatIdx === activeIndex;
                        return (
                          <li key={`${item.kind}:${item.id}`}>
                            <button
                              type="button"
                              onMouseEnter={() => setActiveIndex(flatIdx)}
                              onClick={() => follow(item)}
                              className={
                                "flex w-full items-center gap-3 px-4 py-2 text-start text-sm transition-colors " +
                                (active
                                  ? "bg-spo-green-soft text-spo-green-deep"
                                  : "text-spo-ink-2 hover:bg-spo-paper")
                              }
                            >
                              <Icon
                                className={
                                  "size-4 shrink-0 " +
                                  (active ? "text-spo-green-deep" : "text-spo-muted")
                                }
                                aria-hidden="true"
                              />
                              <span className="min-w-0 flex-1 truncate">{item.title}</span>
                              {item.subtitle && (
                                <span className="hidden truncate text-xs text-spo-muted sm:inline">
                                  {item.subtitle}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-spo-line bg-spo-paper px-4 py-2 text-[11px] text-spo-muted">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-spo-line bg-white px-1">↑↓</kbd>
                  {t("nav")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-spo-line bg-white px-1">↵</kbd>
                  {t("open")}
                </span>
              </div>
              <FileText className="size-3.5" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
