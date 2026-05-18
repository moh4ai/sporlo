// Renders a branded square logo for an integration. Tries
// https://cdn.simpleicons.org first (public-domain SVGs for ~3000 brands);
// when the integration's simple_icon slug is null (Saudi-specific providers
// mostly), falls back to a gradient avatar with the brand's first letter.
//
// Server component — no client state, no JS shipped.

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

  if (simpleIcon) {
    // Tint the SVG with the brand colour via the CDN's query param.
    const src = `https://cdn.simpleicons.org/${simpleIcon}/${brandColor}`;
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-md bg-white p-1.5"
        style={{
          width: dims,
          height: dims,
          boxShadow: `0 0 0 1px ${hexAlpha(brandColor, 0.12)}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          aria-hidden="true"
          width={dims - 12}
          height={dims - 12}
          loading="lazy"
          className="h-full w-full"
        />
      </span>
    );
  }

  // Gradient fallback for brands without a simpleicons entry.
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
