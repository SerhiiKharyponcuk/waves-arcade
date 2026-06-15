import type { SkinCategory, SkinVisualConfig } from "@waves/shared";

interface SkinPreviewProps {
  category?: SkinCategory;
  visual: SkinVisualConfig;
  compact?: boolean;
}

export function SkinPreview({ category = "trail", visual, compact = false }: SkinPreviewProps) {
  const isArrow = category === "arrow";

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-white/10 bg-ink ${compact ? "h-20" : "h-32"}`}
      style={{
        boxShadow: `inset 0 0 40px ${visual.glowColor}22`
      }}
    >
      <div className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-white/10" />
      {!isArrow ? (
        <>
          <div
            className="absolute left-3 right-8 top-1/2 h-4 -translate-y-1/2 rounded-full opacity-25 blur-md"
            style={{ background: `linear-gradient(90deg, transparent, ${visual.glowColor}, ${visual.primaryColor})` }}
          />
          <div
            className="absolute left-4 right-10 top-1/2 h-2 -translate-y-1/2 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${visual.secondaryColor}, ${visual.primaryColor})`,
              boxShadow: `0 0 18px ${visual.glowColor}`
            }}
          />
          <div
            className="absolute left-8 right-20 top-[calc(50%-10px)] h-1 rounded-full opacity-70"
            style={{
              background:
                visual.trailTexture === "rainbow"
                  ? "linear-gradient(90deg, #fb7185, #facc15, #22c55e, #38bdf8, #a78bfa)"
                  : `linear-gradient(90deg, transparent, ${visual.particleColor})`
            }}
          />
        </>
      ) : (
        <div
          className="absolute left-5 right-28 top-1/2 h-1 -translate-y-1/2 rounded-full opacity-50"
          style={{
            background: `linear-gradient(90deg, transparent, ${visual.secondaryColor})`,
            boxShadow: `0 0 12px ${visual.glowColor}`
          }}
        />
      )}
      <div
        className={`absolute top-1/2 -translate-y-1/2 ${isArrow ? "right-1/2 h-14 w-20 translate-x-1/2" : "right-6 h-9 w-12"}`}
        style={{
          clipPath: "polygon(0 10%, 100% 50%, 0 90%, 18% 50%)",
          background: `linear-gradient(135deg, ${visual.primaryColor}, ${visual.secondaryColor})`,
          filter: `drop-shadow(0 0 14px ${visual.glowColor})`
        }}
      />
      {isArrow ? (
        <div
          className="absolute left-1/2 top-1/2 h-20 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-xl"
          style={{ background: visual.glowColor }}
        />
      ) : null}
      <div className="absolute inset-0 bg-grid bg-[size:18px_18px] opacity-30" />
    </div>
  );
}
