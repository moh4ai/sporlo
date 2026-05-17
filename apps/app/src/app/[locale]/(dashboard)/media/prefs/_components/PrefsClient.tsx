"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { canPerform, type Principal } from "@sporlo/auth";
import {
  EmptyTableRow,
  Switch,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import { updateNotificationPrefs } from "../../actions";

export type PrefRow = {
  member_id: string;
  member_name: string;
  email_opt_in: boolean;
  sms_opt_in: boolean;
  whatsapp_opt_in: boolean;
};

export function PrefsClient({
  rows,
  principal,
}: {
  rows: PrefRow[];
  principal: Principal;
}) {
  const t = useTranslations("media");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canEdit = canPerform(principal, "update", "notification_pref");
  const [local, setLocal] = useState(rows);

  async function flip(
    id: string,
    field: "email_opt_in" | "sms_opt_in" | "whatsapp_opt_in",
    next: boolean,
  ) {
    setLocal((cur) =>
      cur.map((r) => (r.member_id === id ? { ...r, [field]: next } : r)),
    );
    const row = local.find((r) => r.member_id === id);
    if (!row) return;
    const res = await updateNotificationPrefs({
      member_id: id,
      email_opt_in: field === "email_opt_in" ? next : row.email_opt_in,
      sms_opt_in: field === "sms_opt_in" ? next : row.sms_opt_in,
      whatsapp_opt_in: field === "whatsapp_opt_in" ? next : row.whatsapp_opt_in,
    });
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.prefsSaved") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
      // Revert local on failure
      setLocal((cur) =>
        cur.map((r) => (r.member_id === id ? { ...r, [field]: !next } : r)),
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-spo-ink">{t("prefs.title")}</h2>
        <p className="text-sm text-spo-muted">{t("prefs.subtitle")}</p>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>{t("prefs.headers.member")}</TH>
            <TH>{t("prefs.headers.email")}</TH>
            <TH>{t("prefs.headers.sms")}</TH>
            <TH>{t("prefs.headers.whatsapp")}</TH>
          </TR>
        </THead>
        <TBody>
          {local.length === 0 ? (
            <EmptyTableRow colSpan={4}>{t("prefs.empty")}</EmptyTableRow>
          ) : (
            local.map((r) => (
              <TR key={r.member_id}>
                <TD className="font-medium">{r.member_name}</TD>
                <TD>
                  <Switch
                    checked={r.email_opt_in}
                    onChange={(v) => canEdit && flip(r.member_id, "email_opt_in", v)}
                    disabled={!canEdit}
                    label=""
                  />
                </TD>
                <TD>
                  <Switch
                    checked={r.sms_opt_in}
                    onChange={(v) => canEdit && flip(r.member_id, "sms_opt_in", v)}
                    disabled={!canEdit}
                    label=""
                  />
                </TD>
                <TD>
                  <Switch
                    checked={r.whatsapp_opt_in}
                    onChange={(v) => canEdit && flip(r.member_id, "whatsapp_opt_in", v)}
                    disabled={!canEdit}
                    label=""
                  />
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </div>
  );
}
