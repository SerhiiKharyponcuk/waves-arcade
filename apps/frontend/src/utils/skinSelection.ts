import type { SkinCategory } from "@waves/shared";
import type { CurrentUser, ShopSkin, UserProfileDto } from "../types/api";

export type SkinFilter = "all" | "arrow" | "trail";

export function isTrailLikeCategory(category: SkinCategory) {
  return category === "trail" || category === "line";
}

export function matchesSkinFilter(skin: ShopSkin, filter: SkinFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "trail") {
    return isTrailLikeCategory(skin.category);
  }

  return skin.category === "arrow";
}

export function profileWithEquippedSkin(user: CurrentUser | null, skin: ShopSkin): UserProfileDto | null {
  if (!user) {
    return null;
  }

  return {
    ...user.profile,
    ...(skin.category === "arrow" || skin.category === "player"
      ? { selectedArrowSkinId: skin.id }
      : skin.category === "trail" || skin.category === "line"
        ? { selectedTrailSkinId: skin.id }
        : { customization: { ...user.profile.customization, [skin.category]: skin.id } })
  };
}
