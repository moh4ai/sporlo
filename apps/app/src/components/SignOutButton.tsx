"use client";

import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function SignOutButton({ label }: { label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="rounded-pill border border-spo-line bg-white px-3 py-1.5 text-xs text-spo-ink-2 transition-colors hover:bg-spo-paper disabled:opacity-60"
    >
      {label}
    </button>
  );
}
