"use client";

import * as React from "react";
import { cn } from "../lib/cn";

export interface FileUploadProps {
  /** Called for each accepted file. */
  onFile: (file: File) => void | Promise<void>;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  label: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}

// Sprint 0: thin file input + drop zone. The actual Supabase Storage upload
// happens in the caller via a Server Action that returns a signed URL — this
// primitive just hands over a File object.
export function FileUpload({
  onFile,
  accept,
  multiple,
  disabled,
  label,
  hint,
  className,
}: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [hovering, setHovering] = React.useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      await onFile(file);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed bg-white p-6 text-center transition-colors",
        hovering ? "border-spo-green bg-spo-green-soft" : "border-spo-line",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setHovering(true);
      }}
      onDragLeave={() => setHovering(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setHovering(false);
        await handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={async (e) => {
          await handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="text-sm text-spo-ink-2">{label}</div>
      {hint && <div className="text-xs text-spo-muted">{hint}</div>}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="rounded-pill border border-spo-line bg-white px-3 py-1.5 text-sm text-spo-ink-2 hover:bg-spo-paper"
      >
        Browse
      </button>
    </div>
  );
}
