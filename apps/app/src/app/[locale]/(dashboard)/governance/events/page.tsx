import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  Badge,
  EmptyTableRow,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@sporlo/ui";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Locale } from "@/i18n/routing";

const CATEGORY_LABELS: Record<string, string> = {
  b: "B",
  c: "C",
  d: "D",
  e: "E",
};

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "governance.events" });

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("kpi_events")
    .select("id, occurred_at, source_module, event_type, criterion_code, category")
    .order("occurred_at", { ascending: false })
    .limit(200);

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-spo-ink">{t("title")}</h2>
        <p className="text-sm text-spo-muted">{t("subtitle")}</p>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("headers.occurredAt")}</TH>
            <TH>{t("headers.module")}</TH>
            <TH>{t("headers.eventType")}</TH>
            <TH>{t("headers.criterion")}</TH>
            <TH>{t("headers.category")}</TH>
          </TR>
        </THead>
        <TBody>
          {!data || data.length === 0 ? (
            <EmptyTableRow colSpan={5}>{t("empty")}</EmptyTableRow>
          ) : (
            data.map((e) => (
              <TR key={e.id}>
                <TD className="text-xs text-spo-muted">
                  {dateFmt.format(new Date(e.occurred_at))}
                </TD>
                <TD className="font-medium">{e.source_module}</TD>
                <TD className="font-mono text-xs">{e.event_type}</TD>
                <TD>{e.criterion_code ?? "—"}</TD>
                <TD>
                  {e.category ? (
                    <Badge tone="neutral">{CATEGORY_LABELS[e.category] ?? e.category}</Badge>
                  ) : (
                    "—"
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </div>
  );
}
