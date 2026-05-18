"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

// Refreshes every minute. Compact server-rendered initial state (so SEO +
// no-JS visitors still see the time) gets replaced by live values once
// hydration completes.
export function MatchCountdown({
  kickoffIso,
  locale,
}: {
  kickoffIso: string;
  locale: "ar" | "en";
}) {
  const t = useTranslations("fansLanding.countdown");
  const target = new Date(kickoffIso).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const diff = target - now;
  if (diff <= 0) return <span className="text-sm">{t("live")}</span>;

  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  // Render the two largest non-zero units in human-friendly form.
  const parts: string[] = [];
  if (day > 0) parts.push(t("days", { count: day }));
  if (hr > 0) parts.push(t("hours", { count: hr % 24 }));
  if (day === 0 && min > 0) parts.push(t("minutes", { count: min % 60 }));

  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xl font-semibold text-spo-green-deep sm:text-2xl">
        {parts.join(" · ") || t("soon")}
      </span>
      <span className="text-sm text-spo-muted">{fmt.format(target)}</span>
    </div>
  );
}
