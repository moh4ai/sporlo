"use client";

import * as React from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

export interface ConfirmModalProps {
  open: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel: React.ReactNode;
  cancelLabel: React.ReactNode;
  intent?: "primary" | "danger";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  intent = "primary",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [busy, setBusy] = React.useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      {description && (
        <p className="mb-4 text-sm text-spo-muted">{description}</p>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          variant={intent === "danger" ? "danger" : "primary"}
          onClick={handleConfirm}
          disabled={busy}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
