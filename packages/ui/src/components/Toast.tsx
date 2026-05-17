"use client";

import * as React from "react";
import { cn } from "../lib/cn";

type ToastTone = "success" | "error" | "info";

export interface ToastInput {
  id?: string;
  tone?: ToastTone;
  title: React.ReactNode;
  description?: React.ReactNode;
  durationMs?: number;
}

interface ToastInternal extends Required<Omit<ToastInput, "description">> {
  description?: React.ReactNode;
}

interface ToastCtx {
  push: (toast: ToastInput) => void;
}

const ToastContext = React.createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastInternal[]>([]);
  const idRef = React.useRef(0);

  const push = React.useCallback((input: ToastInput) => {
    const id = input.id ?? String(++idRef.current);
    const toast: ToastInternal = {
      id,
      tone: input.tone ?? "info",
      title: input.title,
      description: input.description,
      durationMs: input.durationMs ?? 5000,
    };
    setItems((prev) => [...prev, toast]);
    if (toast.durationMs > 0) {
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, toast.durationMs);
    }
  }, []);

  const value = React.useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport items={items} onDismiss={(id) =>
        setItems((prev) => prev.filter((t) => t.id !== id))
      } />
    </ToastContext.Provider>
  );
}

const toneStyles: Record<ToastTone, string> = {
  success: "border-spo-green/30 bg-spo-green-soft text-spo-green-deep",
  error: "border-spo-danger/30 bg-spo-danger/10 text-spo-danger",
  info: "border-spo-line bg-white text-spo-ink-2",
};

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastInternal[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-4 end-4 z-50 flex w-80 max-w-full flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto rounded-card border p-3 text-sm shadow-md",
            toneStyles[t.tone],
          )}
          role="status"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <div className="font-medium">{t.title}</div>
              {t.description && (
                <div className="text-xs opacity-80">{t.description}</div>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => onDismiss(t.id)}
              className="text-spo-muted hover:opacity-80"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
