"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@sporlo/ui";

import { logImpersonation } from "@/app/[locale]/(admin)/clubs/[id]/actions";

export function ImpersonateButton({
  orgId,
  clubName,
}: {
  orgId: string;
  clubName: string;
}) {
  const t = useTranslations("club");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    const res = await logImpersonation(orgId);
    setBusy(false);
    if (res.ok) {
      setDone(true);
    } else {
      setError(res.error ?? "failed");
    }
  }

  if (done) {
    return (
      <p className="rounded-xl bg-spo-green-soft p-3 text-sm text-spo-green-deep">
        {t("impersonateSuccess", { clubName })}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button onClick={onClick} disabled={busy} variant="secondary">
        {t("impersonate")}
      </Button>
      {error && <p className="text-sm text-spo-danger">{error}</p>}
    </div>
  );
}
