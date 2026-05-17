"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search } from "lucide-react";

import { canPerform, type Principal } from "@sporlo/auth";
import {
  Badge,
  Button,
  EmptyTableRow,
  Input,
  Pagination,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@sporlo/ui";

import { Link } from "@/i18n/navigation";

export type MemberRow = {
  id: string;
  full_name_ar: string;
  full_name_en: string | null;
  member_number: string | null;
  status: "active" | "inactive" | "prospect";
  email: string | null;
  phone: string | null;
  joined_at: string;
};

const STATUS_TONES = {
  active: "green",
  inactive: "neutral",
  prospect: "amber",
} as const;

const PAGE_SIZE = 20;

export function MembersListClient({
  members,
  principal,
  locale,
}: {
  members: MemberRow[];
  principal: Principal;
  locale: "ar" | "en";
}) {
  const t = useTranslations("memberships");
  const canCreate = useMemo(() => canPerform(principal, "create", "member"), [principal]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive" | "prospect">("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (status !== "all" && m.status !== status) return false;
      if (!q) return true;
      const hay = [
        m.full_name_ar,
        m.full_name_en ?? "",
        m.member_number ?? "",
        m.phone ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [members, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [locale],
  );

  const displayName = (m: MemberRow) => (locale === "ar" ? m.full_name_ar : m.full_name_en || m.full_name_ar);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-spo-ink">{t("members.title")}</h2>
          <p className="text-sm text-spo-muted">{t("members.subtitle")}</p>
        </div>
        {canCreate && (
          <Link href="/memberships/members/new">
            <Button>
              <Plus className="size-4 me-1.5" aria-hidden="true" />
              {t("members.newMember")}
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-spo-muted"
            aria-hidden="true"
          />
          <Input
            placeholder={t("members.filters.search")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="ps-9"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as typeof status);
            setPage(1);
          }}
          className="w-auto min-w-[10rem]"
        >
          <option value="all">{t("members.filters.all")}</option>
          <option value="active">{t("members.statuses.active")}</option>
          <option value="inactive">{t("members.statuses.inactive")}</option>
          <option value="prospect">{t("members.statuses.prospect")}</option>
        </Select>
        <span className="ms-auto text-xs text-spo-muted">
          {filtered.length} / {members.length}
        </span>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("members.headers.name")}</TH>
            <TH>{t("members.headers.memberNumber")}</TH>
            <TH>{t("members.headers.status")}</TH>
            <TH>{t("members.headers.phone")}</TH>
            <TH>{t("members.headers.email")}</TH>
            <TH>{t("members.headers.joined")}</TH>
            <TH>{t("members.headers.actions")}</TH>
          </TR>
        </THead>
        <TBody>
          {pageRows.length === 0 ? (
            <EmptyTableRow colSpan={7}>{t("members.empty")}</EmptyTableRow>
          ) : (
            pageRows.map((m) => (
              <TR key={m.id}>
                <TD className="font-medium">{displayName(m)}</TD>
                <TD>
                  {m.member_number ? (
                    <code className="rounded bg-spo-paper px-1.5 py-0.5 text-xs">
                      {m.member_number}
                    </code>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD>
                  <Badge tone={STATUS_TONES[m.status]}>
                    {t(`members.statuses.${m.status}`)}
                  </Badge>
                </TD>
                <TD dir="ltr">{m.phone ?? "—"}</TD>
                <TD dir="ltr">{m.email ?? "—"}</TD>
                <TD className="text-xs text-spo-muted">
                  {dateFmt.format(new Date(m.joined_at))}
                </TD>
                <TD>
                  <Link
                    href={`/memberships/members/${m.id}`}
                    className="text-sm text-spo-green-deep hover:underline"
                  >
                    {t("common.edit")}
                  </Link>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {pageCount > 1 && (
        <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      )}
    </div>
  );
}
