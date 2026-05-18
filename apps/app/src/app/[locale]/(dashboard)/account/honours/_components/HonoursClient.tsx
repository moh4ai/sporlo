"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trophy } from "lucide-react";

import {
  Badge,
  Button,
  Drawer,
  EmptyTableRow,
  FormGroup,
  Input,
  RowActions,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import { createHonour, deleteHonour, updateHonour } from "../actions";

export type HonourRow = {
  id: string;
  competition_ar: string;
  competition_en: string;
  kind: "league" | "domestic_cup" | "continental" | "international" | "regional" | "other";
  win_count: number;
  last_won_year: number | null;
  display_order: number;
};

const KINDS: ReadonlyArray<HonourRow["kind"]> = [
  "league",
  "domestic_cup",
  "continental",
  "international",
  "regional",
  "other",
];

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; row: HonourRow };

export function HonoursClient({
  honours,
  locale,
}: {
  honours: HonourRow[];
  locale: "ar" | "en";
}) {
  const t = useTranslations("honours");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });

  const totalWins = honours.reduce((sum, h) => sum + h.win_count, 0);

  async function remove(id: string) {
    const res = await deleteHonour({ id });
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.deleted") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.failed"), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("title")}</h2>
          <p className="text-sm text-spo-muted">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {totalWins > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-spo-line bg-white px-3 py-1.5 text-sm text-spo-ink-2">
              <Trophy className="size-3.5 text-spo-amber" aria-hidden="true" />
              <span className="font-semibold">{totalWins}</span>
              <span className="text-spo-muted">{t("totalWins")}</span>
            </span>
          )}
          <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
            <Plus className="size-4 me-1.5" aria-hidden="true" />
            {t("add")}
          </Button>
        </div>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("headers.competition")}</TH>
            <TH>{t("headers.kind")}</TH>
            <TH>{t("headers.wins")}</TH>
            <TH>{t("headers.lastWon")}</TH>
            <TH>{t("headers.order")}</TH>
            <th className="px-4 py-3 text-end text-[11px] font-semibold text-spo-muted">
              {t("headers.actions")}
            </th>
          </TR>
        </THead>
        <TBody>
          {honours.length === 0 ? (
            <EmptyTableRow colSpan={6}>{t("empty")}</EmptyTableRow>
          ) : (
            honours.map((h) => (
              <TR key={h.id}>
                <TD className="font-medium">
                  {locale === "ar" ? h.competition_ar : h.competition_en}
                </TD>
                <TD>
                  <Badge tone="neutral">{t(`kinds.${h.kind}`)}</Badge>
                </TD>
                <TD className="font-semibold text-spo-amber">{h.win_count}</TD>
                <TD>{h.last_won_year ?? "—"}</TD>
                <TD className="text-xs text-spo-muted">{h.display_order}</TD>
                <TD className="text-end">
                  <RowActions
                    label={t("headers.actions")}
                    actions={[
                      {
                        key: "edit",
                        label: t("actions.edit"),
                        onSelect: () => setDrawer({ open: true, mode: "edit", row: h }),
                      },
                      {
                        key: "delete",
                        label: t("actions.delete"),
                        danger: true,
                        separator: true,
                        onSelect: () => remove(h.id),
                      },
                    ]}
                  />
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <HonourDrawer
        state={drawer}
        onClose={() => setDrawer({ open: false })}
        onSaved={() => {
          setDrawer({ open: false });
          startTransition(() => router.refresh());
        }}
      />
    </div>
  );
}

function HonourDrawer({
  state,
  onClose,
  onSaved,
}: {
  state: DrawerState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("honours");
  const toast = useToast();
  const isEdit = state.open && state.mode === "edit";
  const editing = state.open && state.mode === "edit" ? state.row : null;

  const [compAr, setCompAr] = useState("");
  const [compEn, setCompEn] = useState("");
  const [kind, setKind] = useState<HonourRow["kind"]>("league");
  const [winCount, setWinCount] = useState("1");
  const [lastWon, setLastWon] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const key = !state.open ? "closed" : state.mode === "create" ? "create" : `edit:${state.row.id}`;
  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "create") {
      setCompAr("");
      setCompEn("");
      setKind("league");
      setWinCount("1");
      setLastWon("");
      setDisplayOrder("0");
    } else {
      setCompAr(state.row.competition_ar);
      setCompEn(state.row.competition_en);
      setKind(state.row.kind);
      setWinCount(String(state.row.win_count));
      setLastWon(state.row.last_won_year ? String(state.row.last_won_year) : "");
      setDisplayOrder(String(state.row.display_order));
    }
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const payload = {
      competition_ar: compAr,
      competition_en: compEn,
      kind,
      win_count: Number(winCount),
      last_won_year: lastWon ? Number(lastWon) : undefined,
      display_order: Number(displayOrder) || 0,
    };
    const res =
      isEdit && editing
        ? await updateHonour({ id: editing.id, ...payload })
        : await createHonour(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({ tone: "success", title: isEdit ? t("toast.updated") : t("toast.added") });
      onSaved();
    } else {
      setErr(res.error);
      toast.push({ tone: "error", title: t("toast.failed") });
    }
  }

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={isEdit ? t("drawer.editTitle") : t("drawer.createTitle")}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("fields.competitionAr")} required>
            <Input value={compAr} onChange={(e) => setCompAr(e.target.value)} dir="rtl" required />
          </FormGroup>
          <FormGroup label={t("fields.competitionEn")} required>
            <Input value={compEn} onChange={(e) => setCompEn(e.target.value)} dir="ltr" required />
          </FormGroup>
        </div>
        <FormGroup label={t("fields.kind")} required>
          <Select value={kind} onChange={(e) => setKind(e.target.value as HonourRow["kind"])}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`kinds.${k}`)}
              </option>
            ))}
          </Select>
        </FormGroup>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormGroup label={t("fields.winCount")} required>
            <Input
              type="number"
              min={1}
              value={winCount}
              onChange={(e) => setWinCount(e.target.value)}
              dir="ltr"
              required
            />
          </FormGroup>
          <FormGroup label={t("fields.lastWonYear")}>
            <Input
              type="number"
              min={1900}
              max={2200}
              value={lastWon}
              onChange={(e) => setLastWon(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
          <FormGroup label={t("fields.displayOrder")}>
            <Input
              type="number"
              min={0}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              dir="ltr"
            />
          </FormGroup>
        </div>
        {err && <p className="text-sm text-spo-danger">{err}</p>}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting} type="button">
            {t("drawer.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t("drawer.saving") : isEdit ? t("drawer.save") : t("drawer.create")}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
