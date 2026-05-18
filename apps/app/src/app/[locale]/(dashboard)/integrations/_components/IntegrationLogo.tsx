import { INTEGRATION_ICONS } from "@/lib/integration-icon-registry";

// Renders a branded square logo for an integration.
//
// Strategy: SVG path data for every supported brand is bundled into the JS
// chunk via integration-icon-registry.ts (generated from the simple-icons
// npm package by scripts/generate-icon-registry.mjs). No external CDN call
// — works regardless of region or browser blocking that defeated the
// earlier cdn.simpleicons.org approach.
//
// When a brand isn't in the registry (most Saudi providers + a handful of
// brands that pulled their logos upstream — Microsoft, Hudl, Klaviyo,
// Amplitude, Freshworks), the component falls back to a gradient initial
// badge in the brand's hex.

export function IntegrationLogo({
  name,
  simpleIcon,
  brandColor,
  size = "md",
}: {
  name: string;
  simpleIcon: string | null;
  brandColor: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "sm" ? 32 : size === "lg" ? 64 : 44;
  const iconPath = simpleIcon ? INTEGRATION_ICONS[simpleIcon] : null;

  if (iconPath) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-md bg-white"
        style={{
          width: dims,
          height: dims,
          boxShadow: `0 0 0 1px ${hexAlpha(brandColor, 0.15)}`,
        }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          width={dims * 0.55}
          height={dims * 0.55}
          fill={`#${brandColor}`}
          xmlns="http://www.w3.org/2000/svg"
          role="img"
        >
          <path d={iconPath} />
        </svg>
      </span>
    );
  }

  // Gradient fallback for brands missing from the registry.
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md font-semibold text-white"
      style={{
        width: dims,
        height: dims,
        fontSize: dims * 0.45,
        background: `linear-gradient(135deg, #${brandColor}, #${darken(brandColor, 0.25)})`,
      }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `#${hex}${a}`;
}

function darken(hex: string, factor: number): string {
  const r = clampChan(parseInt(hex.slice(0, 2), 16) * (1 - factor));
  const g = clampChan(parseInt(hex.slice(2, 4), 16) * (1 - factor));
  const b = clampChan(parseInt(hex.slice(4, 6), 16) * (1 - factor));
  return [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
}

function clampChan(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}
