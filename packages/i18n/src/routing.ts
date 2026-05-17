import { defineRouting } from "next-intl/routing";

// Shared routing config across every Sporlo Next.js app (apps/app, apps/admin,
// and any future apps like the public club site). Single source of truth for
// locales + the localePrefix policy ("always" — every URL carries /ar or /en).
export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
