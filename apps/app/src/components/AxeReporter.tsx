"use client";

import { useEffect } from "react";

/**
 * Dev-only axe-core reporter. Logs accessibility violations to the console
 * after each React render. Production builds receive a no-op since the
 * dynamic import is guarded by NODE_ENV.
 */
export function AxeReporter() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined") return;
    // Dynamic imports so the package is never bundled in production.
    Promise.all([import("react"), import("react-dom"), import("@axe-core/react")])
      .then(([React, ReactDOM, axe]) => {
        axe.default(React.default, ReactDOM.default, 1000);
      })
      .catch(() => {
        // axe-core not installed in this environment — silently ignore.
      });
  }, []);

  return null;
}
