import type { SkinVisualConfig } from "@waves/shared";
import type { CurrentUser, ShopSkin } from "../../types/api";

export interface GameSkinBundle {
  arrow: SkinVisualConfig;
  trail: SkinVisualConfig;
}

export const defaultArrowVisual: SkinVisualConfig = {
  primaryColor: "#22c55e",
  secondaryColor: "#16a34a",
  glowColor: "#4ade80",
  particleColor: "#bbf7d0",
  trailTexture: "solid"
};

export const defaultTrailVisual: SkinVisualConfig = {
  primaryColor: "#38bdf8",
  secondaryColor: "#2563eb",
  glowColor: "#0ea5e9",
  particleColor: "#7dd3fc",
  trailTexture: "solid"
};

export function resolveGameSkins(user: CurrentUser | null, skins: ShopSkin[]): GameSkinBundle {
  const selectedArrow = skins.find((skin) => skin.id === user?.profile.selectedArrowSkinId);
  const selectedTrail = skins.find((skin) => skin.id === user?.profile.selectedTrailSkinId);

  return {
    arrow: selectedArrow?.visual ?? defaultArrowVisual,
    trail: selectedTrail?.visual ?? defaultTrailVisual
  };
}
