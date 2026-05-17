"use client";

import { useEffect } from "react";

/**
 * Applies persisted user prefs to `<html>` on mount. We do it client-side
 * so anonymous routes (sign-in, public site) don't pay for a Supabase fetch
 * in the root layout. The dashboard layout fetches the prefs once and hands
 * them to this component — there's a brief un-styled flash on first paint
 * for users with non-default settings, which we accept.
 */
export function PrefsInit({
  highContrast,
  reducedMotion,
}: {
  highContrast: boolean;
  reducedMotion: boolean;
}) {
  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.setAttribute("data-contrast", "high");
    } else {
      root.removeAttribute("data-contrast");
    }
    if (reducedMotion) {
      root.setAttribute("data-motion", "reduced");
    } else {
      root.removeAttribute("data-motion");
    }
  }, [highContrast, reducedMotion]);

  return null;
}
