"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

import { acceptInvitation } from "../../../(dashboard)/users/actions";

type Status = "valid" | "invalid" | "expired" | "accepted";

export function AcceptInviteClient({
  locale,
  token,
  status,
  invitationEmail,
  invitationRole,
  clubName,
  currentEmail,
}: {
  locale: "ar" | "en";
  token: string;
  status: Status;
  invitationEmail: string | null;
  invitationRole: string | null;
  clubName: { ar: string; en: string } | null;
  currentEmail: string | null;
}) {
  const t = useTranslations("acceptInvite");
  const tRoles = useTranslations("users.roles");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const club = clubName ? (locale === "ar" ? clubName.ar : clubName.en) : "";
  const roleLabel =
    invitationRole && hasRoleKey(invitationRole) ? tRoles(invitationRole) : invitationRole ?? "";

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  async function accept() {
    setSubmitting(true);
    setErr(null);
    const res = await acceptInvitation({ token });
    if (!res.ok) {
      setSubmitting(false);
      const msg =
        res.error === "expired"
          ? t("errors.expired")
          : res.error === "accepted"
            ? t("errors.accepted")
            : res.error === "invalid-token" || res.error === "wrong-account"
              ? t("errors.invalidToken")
              : t("errors.generic");
      setErr(msg);
      return;
    }
    // Refresh the JWT so the auth hook re-runs and picks up the new
    // public.users row. Then send the user to the dashboard.
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.refreshSession();
    } catch {
      // Best-effort: a hard navigation still works because the middleware
      // refreshes the session on the next request.
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md space-y-5 rounded-card-lg border border-spo-line bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Image
          src="/brand/sporlo-logo-green.png"
          alt="Sporlo"
          width={28}
          height={28}
          priority
        />
        <span
          className="text-xl text-spo-green-deep"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Sporlo
        </span>
      </div>

      {status === "invalid" && (
        <Body title={t("errors.invalidToken")} />
      )}
      {status === "expired" && (
        <Body title={t("errors.expired")} />
      )}
      {status === "accepted" && (
        <Body title={t("errors.accepted")} />
      )}

      {status === "valid" && (
        <>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-spo-ink">
              {t("title", { club })}
            </h1>
            <p className="text-sm text-spo-muted">
              {t("subtitle", { club, role: roleLabel })}
            </p>
          </div>

          {currentEmail ? (
            currentEmail.toLowerCase() === (invitationEmail ?? "").toLowerCase() ? (
              <div className="space-y-3">
                <p className="text-sm text-spo-ink-2">
                  {t("signedInAs", { email: currentEmail })}
                </p>
                <Button onClick={accept} disabled={submitting} className="w-full">
                  {submitting ? t("accepting") : t("accept")}
                </Button>
                {err && <p className="text-sm text-spo-danger">{err}</p>}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-spo-ink-2">
                  {t("wrongAccount", { expected: invitationEmail ?? "" })}
                </p>
                <Button variant="ghost" onClick={signOut} className="w-full">
                  {t("signOut")}
                </Button>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-spo-ink-2">
                {t("signInRequired", { expected: invitationEmail ?? "" })}
              </p>
              <Button
                onClick={() => router.push(`/sign-in`)}
                className="w-full"
              >
                {t("signIn")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Body({ title }: { title: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold text-spo-ink">{title}</h1>
    </div>
  );
}

function hasRoleKey(role: string): role is "club_admin" | "dept_manager" | "staff" | "coach" | "auditor" | "member" {
  return [
    "club_admin",
    "dept_manager",
    "staff",
    "coach",
    "auditor",
    "member",
  ].includes(role);
}
