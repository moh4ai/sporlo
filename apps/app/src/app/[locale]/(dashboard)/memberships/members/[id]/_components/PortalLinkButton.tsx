"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button, useToast } from "@sporlo/ui";

import { issueMemberPortalLink } from "../../../actions";

export function PortalLinkButton({ memberId }: { memberId: string }) {
  const t = useTranslations("memberships");
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    const res = await issueMemberPortalLink({ member_id: memberId });
    setBusy(false);
    if (res.ok) {
      setLastUrl(res.data.url);
      toast.push({
        tone: "success",
        title: t("portal.linkCopied"),
        description: res.data.emailed ? t("portal.linkCopiedDesc") : res.data.url,
      });
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(res.data.url);
        } catch {
          // Clipboard write is best-effort; the URL is shown in the toast.
        }
      }
    } else {
      toast.push({ tone: "error", title: t("portal.linkFailed"), description: res.error });
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="ghost" onClick={onClick} disabled={busy}>
        {t("portal.sendLink")}
      </Button>
      {lastUrl && (
        <code className="block break-all rounded bg-spo-paper px-2 py-1 text-xs">
          {lastUrl}
        </code>
      )}
    </div>
  );
}
