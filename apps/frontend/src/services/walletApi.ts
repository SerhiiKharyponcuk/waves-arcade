import type {
  AdPlacement,
  AdProvider,
  AdRewardCompleteDto,
  AdRewardSessionDto,
  DailyRewardDto,
  RouletteConfigDto,
  RouletteSpinDto,
  SubscriptionBenefitsDto,
  WalletDto
} from "../types/api";
import { apiRequest } from "./apiClient";

export const walletApi = {
  wallet() {
    return apiRequest<WalletDto>("/wallet");
  },
  dailyReward() {
    return apiRequest<DailyRewardDto>("/wallet/daily-reward");
  },
  claimDailyReward() {
    return apiRequest<{ reward: DailyRewardDto; wallet: WalletDto }>("/wallet/reward", {
      method: "POST"
    });
  },
  rouletteConfig() {
    return apiRequest<RouletteConfigDto>("/wallet/roulette/config");
  },
  spinRoulette(adsWatched: number) {
    return apiRequest<{ wallet: WalletDto; spin: RouletteSpinDto; nextSpinCostAds: number }>("/wallet/roulette/spin", {
      method: "POST",
      body: JSON.stringify({ adsWatched })
    });
  },
  startAdReward(placement: AdPlacement, provider?: AdProvider) {
    return apiRequest<AdRewardSessionDto>("/wallet/ad/reward/start", {
      method: "POST",
      body: JSON.stringify({ placement, provider })
    });
  },
  completeAdReward(payload: {
    adSessionId: string;
    provider?: AdProvider;
    providerEventId?: string;
    providerPayload?: Record<string, unknown>;
  }) {
    return apiRequest<AdRewardCompleteDto>("/wallet/ad/reward/complete", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  subscriptionBenefits() {
    return apiRequest<SubscriptionBenefitsDto>("/wallet/subscription/benefits");
  },
  purchasePlaceholder(payload: {
    sku: string;
    amountCents: number;
    currency: "USD" | "EUR";
    provider: "stripe" | "google_play" | "apple_iap" | "placeholder";
    idempotencyKey?: string;
  }) {
    const idempotencyKey = payload.idempotencyKey ?? `wallet-${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    return apiRequest("/wallet/purchase-placeholder", {
      method: "POST",
      body: JSON.stringify({ ...payload, idempotencyKey })
    });
  }
};
