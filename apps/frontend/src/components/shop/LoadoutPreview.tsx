import type { SkinVisualConfig } from "@waves/shared";

interface LoadoutPreviewProps {
  arrowVisual: SkinVisualConfig;
  trailVisual: SkinVisualConfig;
}

export function LoadoutPreview({ arrowVisual, trailVisual }: LoadoutPreviewProps) {
  return (
    <div
      className="relative min-h-36 overflow-hidden rounded-lg border border-white/10 bg-ink"
      style={{
        boxShadow: `inset 0 0 44px ${trailVisual.glowColor}22`
      }}
    >
      <div className="absolute inset-0 bg-grid bg-[size:20px_20px] opacity-25" />
      <div
        className="absolute left-8 right-16 top-1/2 h-5 -translate-y-1/2 rounded-full opacity-30 blur-md"
        style={{
          background: `linear-gradient(90deg, transparent, ${trailVisual.glowColor}, ${trailVisual.primaryColor})`
        }}
      />
      <div
        className="absolute left-10 right-24 top-1/2 h-3 -translate-y-1/2 rounded-full"
        style={{
          background:
            trailVisual.trailTexture === "rainbow"
              ? "linear-gradient(90deg, transparent, #fb7185, #facc15, #22c55e, #38bdf8, #a78bfa)"
              : `linear-gradient(90deg, transparent, ${trailVisual.secondaryColor}, ${trailVisual.primaryColor})`,
          boxShadow: `0 0 22px ${trailVisual.glowColor}`
        }}
      />
      <div
        className="absolute right-9 top-1/2 h-24 w-28 -translate-y-1/2 rounded-full opacity-20 blur-2xl"
        style={{ background: arrowVisual.glowColor }}
      />
      <div
        className="absolute right-14 top-1/2 h-16 w-24 -translate-y-1/2"
        style={{
          clipPath: "polygon(0 10%, 100% 50%, 0 90%, 18% 50%)",
          background: `linear-gradient(135deg, ${arrowVisual.primaryColor}, ${arrowVisual.secondaryColor})`,
          filter: `drop-shadow(0 0 18px ${arrowVisual.glowColor})`
        }}
      />
    </div>
  );
}
