"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { canPerform, type Principal } from "@sporlo/auth";
import {
  Badge,
  Button,
  Drawer,
  EmptyTableRow,
  FormGroup,
  Input,
  Switch,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@sporlo/ui";

import { Link, useRouter } from "@/i18n/navigation";

import { archiveSquad, createSquad, updateSquad } from "../actions";

export type SquadRow = {
  id: string;
  name_ar: string;
  name_en: string;
  season: string | null;
  sport_type: string;
  active: boolean;
  player_count: number;
};

type DrawerState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; squad: SquadRow };

export function SquadsListClient({
  squads,
  principal,
  locale,
}: {
  squads: SquadRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("team");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canCreate = useMemo(() => canPerform(principal, "create", "team"), [principal]);
  const canUpdate = useMemo(() => canPerform(principal, "update", "team"), [principal]);
  const canDelete = useMemo(() => canPerform(principal, "delete", "team"), [principal]);
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });

  async function archive(s: SquadRow) {
    const res = await archiveSquad({ id: s.id });
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.squadArchived") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">
            {t("squads.title")}
          </h2>
          <p className="text-sm text-spo-muted">{t("squads.subtitle")}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setDrawer({ open: true, mode: "create" })}>
            {t("squads.newSquad")}
          </Button>
        )}
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("squads.headers.name")}</TH>
            <TH>{t("squads.headers.season")}</TH>
            <TH>{t("squads.headers.sportType")}</TH>
            <TH>{t("squads.headers.players")}</TH>
            <TH>{t("squads.headers.status")}</TH>
            <TH>{t("squads.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {squads.length === 0 ? (
            <EmptyTableRow colSpan={6}>{t("squads.empty")}</EmptyTableRow>
          ) : (
            squads.map((s) => (
              <TR key={s.id}>
                <TD className="font-medium">
                  <Link
                    href={`/team/${s.id}`}
                    className="text-spo-green-deep hover:underline"
                  >
                    {locale === "ar" ? s.name_ar : s.name_en}
                  </Link>
                </TD>
                <TD>{s.season ?? "—"}</TD>
                <TD>{s.sport_type}</TD>
                <TD>{s.player_count}</TD>
                <TD>
                  {s.active ? (
                    <Badge tone="green">{t("common.active")}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("common.archived")}</Badge>
                  )}
                </TD>
                <TD className="space-x-2 rtl:space-x-reverse">
                  {canUpdate && (
                    <button
                      type="button"
                      onClick={() => setDrawer({ open: true, mode: "edit", squad: s })}
                      className="text-sm text-spo-green-deep hover:underline"
                    >
                      {t("common.edit")}
                    </button>
                  )}
                  {canDelete && s.active && (
                    <button
                      type="button"
                      onClick={() => archive(s)}
                      className="text-sm text-spo-muted hover:text-spo-ink-2"
                    >
                      {t("common.archive")}
                    </button>
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <SquadFormDrawer
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

function SquadFormDrawer({
  state,
  onClose,
  onSaved,
}: {
  state: DrawerState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("team");
  const toast = useToast();
  const isEdit = state.open && state.mode === "edit";
  const editing = state.open && state.mode === "edit" ? state.squad : null;

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [season, setSeason] = useState("");
  const [sport, setSport] = useState("football");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const key = !state.open ? "closed" : state.mode === "create" ? "create" : `edit:${state.squad.id}`;
  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "create") {
      setNameAr("");
      setNameEn("");
      setSeason(currentSeason());
      setSport("football");
      setActive(true);
    } else {
      setNameAr(state.squad.name_ar);
      setNameEn(state.squad.name_en);
      setSeason(state.squad.season ?? "");
      setSport(state.squad.sport_type);
      setActive(state.squad.active);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      name_ar: nameAr.trim(),
      name_en: nameEn.trim(),
      season,
      sport_type: sport,
      active,
    };
    const res = isEdit && editing
      ? await updateSquad({ id: editing.id, ...payload })
      : await createSquad(payload);
    setSubmitting(false);
    if (res.ok) {
      toast.push({
        tone: "success",
        title: isEdit ? t("toast.squadUpdated") : t("toast.squadCreated"),
      });
      onSaved();
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={isEdit ? t("squads.form.editTitle") : t("squads.form.createTitle")}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("squads.form.nameAr")} required>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" required />
          </FormGroup>
          <FormGroup label={t("squads.form.nameEn")} required>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" required />
          </FormGroup>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormGroup label={t("squads.form.season")}>
            <Input value={season} onChange={(e) => setSeason(e.target.value)} dir="ltr" />
          </FormGroup>
          <FormGroup label={t("squads.form.sportType")}>
            <Input value={sport} onChange={(e) => setSport(e.target.value)} dir="ltr" />
          </FormGroup>
        </div>
        <Switch checked={active} onChange={setActive} label={t("common.active")} />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {isEdit ? t("common.save") : t("common.create")}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function currentSeason(): string {
  const now = new Date();
  // Northern-hemisphere style season: Aug-Jul. Switch to next season Aug 1.
  const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}
