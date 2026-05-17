"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button, ConfirmModal, useToast } from "@sporlo/ui";

import { useRouter } from "@/i18n/navigation";

import {
  installIntegration,
  uninstallIntegration,
} from "../actions";

export function IntegrationActions({
  slug,
  isInstalled,
  canInstall,
  canUninstall,
}: {
  slug: string;
  isInstalled: boolean;
  canInstall: boolean;
  canUninstall: boolean;
}) {
  const t = useTranslations("integrations");
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function install() {
    setBusy(true);
    const res = await installIntegration({ slug });
    setBusy(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.installed") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  async function uninstall() {
    setBusy(true);
    setConfirming(false);
    const res = await uninstallIntegration({ slug });
    setBusy(false);
    if (res.ok) {
      toast.push({ tone: "success", title: t("toast.uninstalled") });
      startTransition(() => router.refresh());
    } else {
      toast.push({ tone: "error", title: t("toast.saveFailed"), description: res.error });
    }
  }

  if (isInstalled) {
    return (
      <>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="danger"
            onClick={() => setConfirming(true)}
            disabled={!canUninstall || busy}
          >
            {busy ? t("actions.uninstalling") : t("actions.uninstall")}
          </Button>
        </div>
        <ConfirmModal
          open={confirming}
          title={t("confirm.uninstallTitle")}
          description={t("confirm.uninstallBody")}
          confirmLabel={t("actions.uninstall")}
          cancelLabel={t("confirm.cancel")}
          intent="danger"
          onConfirm={uninstall}
          onCancel={() => setConfirming(false)}
        />
      </>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button onClick={install} disabled={!canInstall || busy}>
        {busy ? t("actions.installing") : t("actions.install")}
      </Button>
    </div>
  );
}
