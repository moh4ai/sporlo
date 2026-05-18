"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/[locale]/(dashboard)/notifications/actions";

export type NotificationRow = {
  id: string;
  type: string;
  title_ar: string;
  title_en: string;
  body_ar: string | null;
  body_en: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell({
  locale,
  initialNotifications,
  initialUnread,
}: {
  locale: "ar" | "en";
  initialNotifications: NotificationRow[];
  initialUnread: number;
}) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>(initialNotifications);
  const [unread, setUnread] = useState(initialUnread);
  const rootRef = useRef<HTMLDivElement>(null);

  // Click outside to close.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Realtime subscription scoped to the signed-in user. New notifications
  // surface live without a page reload.
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `recipient_user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as NotificationRow;
            setRows((prev) => [row, ...prev].slice(0, 20));
            setUnread((n) => n + 1);
          },
        )
        .subscribe();
      cleanup = () => {
        supabase.removeChannel(channel);
      };
    })();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  async function markRead(id: string) {
    const target = rows.find((r) => r.id === id);
    if (!target || target.read_at) return;
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, read_at: new Date().toISOString() } : r)),
    );
    setUnread((n) => Math.max(n - 1, 0));
    const res = await markNotificationRead({ id });
    if (!res.ok) {
      // Roll back optimistic flip.
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, read_at: null } : r)));
      setUnread((n) => n + 1);
    }
  }

  async function markAll() {
    setRows((prev) => prev.map((r) => ({ ...r, read_at: r.read_at ?? new Date().toISOString() })));
    setUnread(0);
    const res = await markAllNotificationsRead();
    if (res.ok) startTransition(() => router.refresh());
  }

  function follow(row: NotificationRow) {
    void markRead(row.id);
    if (row.href) {
      setOpen(false);
      router.push(row.href);
    }
  }

  function relativeTime(iso: string) {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return t("justNow");
    if (min < 60) return t("minutesAgo", { count: min });
    const hr = Math.floor(min / 60);
    if (hr < 24) return t("hoursAgo", { count: hr });
    const day = Math.floor(hr / 24);
    return t("daysAgo", { count: day });
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("openLabel")}
        className="relative flex size-10 items-center justify-center rounded-md text-spo-ink-2 transition-colors hover:bg-spo-paper"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute end-1.5 top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-spo-danger px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-12 z-40 w-80 overflow-hidden rounded-card border border-spo-line bg-white shadow-[var(--shadow-3)]">
          <div className="flex items-center justify-between border-b border-spo-line px-3 py-2">
            <span className="text-sm font-semibold text-spo-ink">{t("title")}</span>
            <button
              type="button"
              onClick={markAll}
              disabled={unread === 0}
              className="text-xs text-spo-green-deep disabled:text-spo-muted"
            >
              {t("markAll")}
            </button>
          </div>

          <ul className="max-h-96 overflow-y-auto">
            {rows.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-spo-muted">
                {t("empty")}
              </li>
            ) : (
              rows.map((row) => {
                const title = locale === "ar" ? row.title_ar : row.title_en;
                const body = locale === "ar" ? row.body_ar : row.body_en;
                const isUnread = !row.read_at;
                return (
                  <li
                    key={row.id}
                    className={
                      "border-b border-spo-line last:border-b-0 " +
                      (isUnread ? "bg-spo-green-soft/40" : "")
                    }
                  >
                    <button
                      type="button"
                      onClick={() => follow(row)}
                      className="block w-full px-3 py-2 text-start hover:bg-spo-paper"
                    >
                      <div className="flex items-start gap-2">
                        {isUnread && (
                          <span
                            aria-hidden="true"
                            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-spo-green"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-spo-ink">
                            {title}
                          </div>
                          {body && (
                            <div className="line-clamp-2 text-xs text-spo-muted">
                              {body}
                            </div>
                          )}
                          <div className="mt-0.5 text-[10px] text-spo-muted">
                            {relativeTime(row.created_at)}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-spo-line px-3 py-2 text-center text-xs text-spo-green-deep hover:bg-spo-paper"
          >
            {t("viewAll")}
          </Link>
        </div>
      )}
    </div>
  );
}
