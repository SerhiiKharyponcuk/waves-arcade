import type { ShopSkin, WalletDto } from "../types/api";
import type { GameThemeDto } from "@waves/shared";
import { apiRequest } from "./apiClient";

export const shopApi = {
  skins() {
    return apiRequest<ShopSkin[]>("/shop/skins");
  },
  mySkins() {
    return apiRequest<ShopSkin[]>("/shop/my-skins");
  },
  buySkin(skinId: string) {
    return apiRequest<{ skin: ShopSkin; wallet: WalletDto }>("/shop/buy-skin", {
      method: "POST",
      body: JSON.stringify({ skinId })
    });
  },
  equipSkin(skinId: string) {
    return apiRequest<ShopSkin[]>("/shop/equip-skin", {
      method: "POST",
      body: JSON.stringify({ skinId })
    });
  },
  themes() {
    return apiRequest<Array<GameThemeDto & { owned: boolean; equipped: boolean; canUnlockByScore: boolean }>>("/shop/themes");
  },
  unlockTheme(themeId: string) {
    return apiRequest<Array<GameThemeDto & { owned: boolean; equipped: boolean; canUnlockByScore: boolean }>>("/shop/unlock-theme", {
      method: "POST",
      body: JSON.stringify({ themeId })
    });
  },
  equipTheme(themeId: string) {
    return apiRequest<Array<GameThemeDto & { owned: boolean; equipped: boolean; canUnlockByScore: boolean }>>("/shop/equip-theme", {
      method: "POST",
      body: JSON.stringify({ themeId })
    });
  }
};
