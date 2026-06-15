import type { ShopSkin, WalletDto } from "../types/api";
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
  }
};
