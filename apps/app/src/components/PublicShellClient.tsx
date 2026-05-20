"use client";

import type { ReactNode } from "react";

import { MiniCartDrawer } from "./MiniCartDrawer";

// Mounts the mini-cart drawer alongside the public-page chrome. The cart
// context itself lives in the locale layout so cart/checkout routes that
// bypass PublicShell still get state.
export function PublicShellClient({
  locale,
  children,
}: {
  locale: "ar" | "en";
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <MiniCartDrawer locale={locale} />
    </>
  );
}
