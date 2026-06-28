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
import type { PaymentCurrency } from "@waves/shared";
import { apiRequest } from "./apiClient";

export type PaymentProviderId = "liqpay" | "stripe" | "mollie" | "paypal" | "adyen" | "google_play" | "apple_iap" | "placeholder";

export interface PaymentIntentDto {
  provider: string;
  externalId: string;
  status: "pending" | "requires_configuration";
  message: string;
  checkoutUrl?: string;
  clientSecret?: string;
}

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
    amountCents?: number;
    supportAmountCents?: number;
    currency: PaymentCurrency;
    provider: PaymentProviderId;
    idempotencyKey?: string;
  }) {
    const idempotencyKey = payload.idempotencyKey ?? `wallet-${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    return apiRequest<PaymentIntentDto>("/wallet/purchase-placeholder", {
      method: "POST",
      body: JSON.stringify({ ...payload, idempotencyKey })
    });
  }
};
