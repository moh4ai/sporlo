"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Badge, Button, Card, FormGroup, Input, useToast } from "@sporlo/ui";

import { scanTicket } from "../../../actions";

type ScanResult =
  | { kind: "valid"; scanned_at: string }
  | { kind: "already"; scanned_at: string }
  | { kind: "invalid"; reason: string };

declare global {
  interface Window {
    // BarcodeDetector exists in Chromium browsers. We feature-detect.
    BarcodeDetector?: new (config?: { formats?: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
    };
  }
}

export function ScannerClient({ locale }: { locale: "ar" | "en" }) {
  const t = useTranslations("events.scan");
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [history, setHistory] = useState<Array<{ code: string; result: ScanResult }>>([]);
  const lastCodeRef = useRef<string | null>(null);
  const lastCodeAtRef = useRef<number>(0);

  // Locale param not used yet but reserved for future localised feedback.
  void locale;

  // Boot camera + detector loop.
  useEffect(() => {
    let cancelled = false;
    let detector: InstanceType<NonNullable<typeof window.BarcodeDetector>> | null = null;

    async function startCamera() {
      try {
        if (!window.BarcodeDetector) {
          setCameraError(t("noCamera"));
          return;
        }
        detector = new window.BarcodeDetector({ formats: ["qr_code"] });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tk) => tk.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }

        const tick = async () => {
          if (cancelled) return;
          const v = videoRef.current;
          if (v && v.readyState === v.HAVE_ENOUGH_DATA && detector) {
            try {
              const codes = await detector.detect(v);
              if (codes.length > 0) {
                const raw = codes[0]!.rawValue;
                const now = Date.now();
                if (raw && (raw !== lastCodeRef.current || now - lastCodeAtRef.current > 2500)) {
                  lastCodeRef.current = raw;
                  lastCodeAtRef.current = now;
                  void submit(raw);
                }
              }
            } catch {
              // Quiet failure — detector throws on busy frames sometimes.
            }
          }
          if (!cancelled) {
            window.setTimeout(tick, 200);
          }
        };
        tick();
      } catch {
        setCameraError(t("noCamera"));
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((tk) => tk.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(code: string) {
    const res = await scanTicket({ qr_code: code });
    if (res.ok) {
      const result: ScanResult = res.data.already_scanned
        ? { kind: "already", scanned_at: res.data.scanned_at }
        : { kind: "valid", scanned_at: res.data.scanned_at };
      setHistory((h) => [{ code, result }, ...h.slice(0, 19)]);
      toast.push({
        tone: result.kind === "valid" ? "success" : "info",
        title: result.kind === "valid" ? t("resultValid") : `${t("resultAlready")} ${result.scanned_at}`,
      });
    } else {
      setHistory((h) => [
        { code, result: { kind: "invalid", reason: res.error } },
        ...h.slice(0, 19),
      ]);
      toast.push({ tone: "error", title: t("resultInvalid"), description: res.error });
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <video
          ref={videoRef}
          playsInline
          className="aspect-video w-full rounded-card bg-spo-ink"
        />
        {!cameraReady && (
          <p className="text-xs text-spo-muted">
            {cameraError ?? "Starting camera…"}
          </p>
        )}
      </Card>

      <Card className="space-y-2">
        <FormGroup label={t("manualLabel")}>
          <div className="flex items-center gap-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              dir="ltr"
              placeholder="QR text"
            />
            <Button
              type="button"
              onClick={async () => {
                if (!manualCode.trim()) return;
                await submit(manualCode.trim());
                setManualCode("");
              }}
            >
              {t("scanBtn")}
            </Button>
          </div>
        </FormGroup>
      </Card>

      {history.length > 0 && (
        <ul className="space-y-1 text-sm">
          {history.map((h, idx) => (
            <li
              key={`${h.code}-${idx}`}
              className="flex items-center justify-between rounded-md border border-spo-line bg-white px-3 py-2"
            >
              <code className="rounded bg-spo-paper px-1.5 py-0.5 text-xs">
                {h.code.slice(0, 14)}…
              </code>
              {h.result.kind === "valid" && <Badge tone="green">{t("resultValid")}</Badge>}
              {h.result.kind === "already" && <Badge tone="amber">{t("resultAlready")}</Badge>}
              {h.result.kind === "invalid" && <Badge tone="danger">{t("resultInvalid")}</Badge>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
