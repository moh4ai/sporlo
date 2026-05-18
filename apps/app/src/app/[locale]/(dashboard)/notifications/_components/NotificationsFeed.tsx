"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button, Card, useToast } from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "../actions";

export type FeedRow = {
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

export function NotificationsFeed({
  rows: initialRows,
  locale,
}: {
  rows: FeedRow[];
  locale: "ar" | "en";
}) {
  const t = useTranslations("notifications");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [rows, setRows] = useState<FeedRow[]>(initialRows);
  const [busy, setBusy] = useState(false);

  const hasUnread = rows.some((r) => !r.read_at);

  async function markAll() {
    setBusy(true);
    setRows((prev) =>
      prev.map((r) => ({ ...r, read_at: r.read_at ?? new Date().toISOString() })),
    );
    const res = await markAllNotificationsRead();
    setBusy(false);
    if (res.ok) {
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.failed"), description: res.error });
    }
  }

  async function follow(row: FeedRow) {
    if (!row.read_at) {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, read_at: new Date().toISOString() } : r)),
      );
      void markNotificationRead({ id: row.id });
    }
    if (row.href) router.push(row.href);
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={markAll}
          disabled={!hasUnread || busy}
        >
          {t("markAll")}
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-spo-muted">{t("empty")}</p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const title = locale === "ar" ? row.title_ar : row.title_en;
            const body = locale === "ar" ? row.body_ar : row.body_en;
            const isUnread = !row.read_at;
            return (
              <li key={row.id}>
                <Card
                  className={
                    "cursor-pointer transition-colors hover:bg-spo-paper " +
                    (isUnread ? "border-spo-green/30" : "")
                  }
                  onClick={() => follow(row)}
                >
                  <div className="flex items-start gap-3">
                    {isUnread && (
                      <span
                        aria-hidden="true"
                        className="mt-2 size-2 shrink-0 rounded-full bg-spo-green"
                      />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="font-medium text-spo-ink">{title}</div>
                      {body && <p className="text-sm text-spo-muted">{body}</p>}
                      <div className="text-xs text-spo-muted">
                        {formatDate(row.created_at)}
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
