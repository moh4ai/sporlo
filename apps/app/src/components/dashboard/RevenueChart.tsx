"use client";

import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type RevenuePoint = {
  /** YYYY-MM label */
  month: string;
  total: number;
};

export function RevenueChart({
  data,
  locale,
}: {
  data: RevenuePoint[];
  locale: "ar" | "en";
}) {
  const t = useTranslations("dashboardCharts");
  const sarFmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  });
  const monthFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    month: "short",
  });

  const display = data.map((d) => ({
    ...d,
    label: monthFmt.format(new Date(`${d.month}-01`)),
  }));

  return (
    <div className="rounded-card border border-spo-line bg-white p-5">
      <header className="mb-4 space-y-0.5">
        <h3 className="text-base font-semibold text-spo-ink">{t("revenue.title")}</h3>
        <p className="text-xs text-spo-muted">{t("revenue.subtitle")}</p>
      </header>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={display} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-spo-line)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--color-spo-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--color-spo-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
              width={40}
            />
            <Tooltip
              cursor={{ fill: "var(--color-spo-green-soft)", opacity: 0.4 }}
              contentStyle={{
                background: "white",
                border: "1px solid var(--color-spo-line)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => sarFmt.format(value)}
              labelFormatter={(label: string) => label}
            />
            <Bar dataKey="total" fill="var(--color-spo-green)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
