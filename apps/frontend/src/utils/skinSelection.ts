import type { SkinCategory } from "@waves/shared";
import type { CurrentUser, ShopSkin, UserProfileDto } from "../types/api";

export type SkinFilter = "all" | "arrow" | "trail";

export function isTrailLikeCategory(category: SkinCategory) {
  return category === "trail" || category === "line" || category === "effect";
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
    ...(skin.category === "arrow"
      ? { selectedArrowSkinId: skin.id }
      : { selectedTrailSkinId: skin.id })
  };
}
