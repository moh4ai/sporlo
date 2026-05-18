"use client";

import { useTranslations } from "next-intl";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export type StatusMix = {
  active: number;
  frozen: number;
  cancelled: number;
  expired: number;
};

const COLORS = {
  active: "var(--color-spo-green)",
  frozen: "var(--color-spo-blue)",
  cancelled: "var(--color-spo-muted)",
  expired: "var(--color-spo-amber)",
};

export function SubscriptionMix({ mix }: { mix: StatusMix }) {
  const t = useTranslations("dashboardCharts");

  const data = [
    { key: "active", label: t("mix.active"), value: mix.active },
    { key: "frozen", label: t("mix.frozen"), value: mix.frozen },
    { key: "cancelled", label: t("mix.cancelled"), value: mix.cancelled },
    { key: "expired", label: t("mix.expired"), value: mix.expired },
  ].filter((d) => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="rounded-card border border-spo-line bg-white p-5">
      <header className="mb-4 space-y-0.5">
        <h3 className="text-base font-semibold text-spo-ink">{t("mix.title")}</h3>
        <p className="text-xs text-spo-muted">{t("mix.subtitle")}</p>
      </header>
      {total === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-spo-muted">
          {t("mix.empty")}
        </div>
      ) : (
        <div className="relative h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                strokeWidth={2}
                stroke="white"
              >
                {data.map((entry) => (
                  <Cell key={entry.key} fill={COLORS[entry.key as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: "1px solid var(--color-spo-line)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "var(--color-spo-ink-2)" }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          >
            <span
              className="text-3xl font-semibold text-spo-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {total}
            </span>
            <span className="text-[11px] uppercase tracking-wider text-spo-muted">
              {t("mix.total")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
