import type { AdPlacement, AdProvider } from "../../types/api";
import { requestGoogleAdManagerRewardedAd } from "./googlePublisherTag";

export interface RewardedAdResult {
  completed: boolean;
  provider: AdProvider;
  providerEventId?: string;
  providerPayload?: Record<string, unknown>;
}

export interface RewardedAdProvider {
  readonly name: AdProvider;
  showRewardedAd(input: { placement: AdPlacement; adSessionId: string }): Promise<RewardedAdResult>;
}

type CrazyGamesSdk = {
  init?: () => Promise<void> | void;
  ad?: {
    requestAd?: (
      type: "rewarded" | "midgame",
      callbacks?: {
        adStarted?: () => void;
        adFinished?: () => void;
        adError?: (error?: unknown) => void;
      }
    ) => Promise<void> | void;
  };
};

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: CrazyGamesSdk;
    };
  }
}

class MockRewardedAdProvider implements RewardedAdProvider {
  readonly name = "mock" as const;

  async showRewardedAd(input: { placement: AdPlacement; adSessionId: string }): Promise<RewardedAdResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    return {
      completed: true,
      provider: this.name,
      providerEventId: `mock-${input.placement}-${input.adSessionId}`,
      providerPayload: {
        placement: input.placement,
        devOnly: true
      }
    };
  }
}

class CrazyGamesRewardedAdProvider implements RewardedAdProvider {
  readonly name = "crazygames" as const;
  private initialized = false;

  async showRewardedAd(input: { placement: AdPlacement; adSessionId: string }): Promise<RewardedAdResult> {
    const sdk = window.CrazyGames?.SDK;
    if (!sdk?.ad?.requestAd) {
      throw new Error("CrazyGames SDK is not available. Run on CrazyGames or use VITE_AD_PROVIDER=mock locally.");
    }

    if (!this.initialized && sdk.init) {
      await sdk.init();
      this.initialized = true;
    }

    return new Promise((resolve, reject) => {
      let settled = false;

      const settle = (result: RewardedAdResult) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(result);
      };

      try {
        const maybePromise = sdk.ad!.requestAd!("rewarded", {
          adStarted: () => {
            // The game can listen to ad lifecycle later for muting audio and analytics.
          },
          adFinished: () =>
            settle({
              completed: true,
              provider: this.name,
              providerEventId: `crazygames-${input.adSessionId}`,
              providerPayload: {
                placement: input.placement
              }
            }),
          adError: (error) => {
            if (settled) {
              return;
            }
            settled = true;
            reject(error instanceof Error ? error : new Error("Rewarded ad was not completed."));
          }
        });

        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise
            .then(() => {
              // Some SDK versions resolve the promise after a completed rewarded ad.
              settle({
                completed: true,
                provider: this.name,
                providerEventId: `crazygames-${input.adSessionId}`,
                providerPayload: {
                  placement: input.placement,
                  promiseResolved: true
                }
              });
            })
            .catch((error) => {
              if (!settled) {
                settled = true;
                reject(error instanceof Error ? error : new Error("Rewarded ad failed."));
              }
            });
        }
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Rewarded ad failed."));
      }
    });
  }
}

class GoogleAdManagerRewardedAdProvider implements RewardedAdProvider {
  readonly name = "google_ad_manager" as const;

  showRewardedAd(input: { placement: AdPlacement; adSessionId: string }): Promise<RewardedAdResult> {
    return requestGoogleAdManagerRewardedAd(input);
  }
}

class UnsupportedRewardedAdProvider implements RewardedAdProvider {
  constructor(readonly name: AdProvider) {}

  async showRewardedAd(): Promise<RewardedAdResult> {
    throw new Error(`${this.name} rewarded ads are reserved for a native mobile build. Use google_ad_manager for web.`);
  }
}

const providerName = (import.meta.env.VITE_AD_PROVIDER ?? "mock") as AdProvider;

export function getRewardedAdProvider(): RewardedAdProvider {
  if (providerName === "crazygames") {
    return new CrazyGamesRewardedAdProvider();
  }

  if (providerName === "google_ad_manager") {
    return new GoogleAdManagerRewardedAdProvider();
  }

  if (providerName === "admob" || providerName === "unity") {
    return new UnsupportedRewardedAdProvider(providerName);
  }

  return new MockRewardedAdProvider();
}
