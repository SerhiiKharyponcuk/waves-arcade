import type { AdPlacement, AdRewardCompleteDto } from "../../types/api";
import { walletApi } from "../walletApi";
import { getRewardedAdProvider } from "./adProvider";

export async function earnRewardedAdReward(placement: AdPlacement): Promise<AdRewardCompleteDto> {
  const provider = getRewardedAdProvider();
  const session = await walletApi.startAdReward(placement, provider.name);
  const adResult = await provider.showRewardedAd({
    placement,
    adSessionId: session.adSessionId
  });

  if (!adResult.completed) {
    throw new Error("Rewarded ad was not completed.");
  }

  return walletApi.completeAdReward({
    adSessionId: session.adSessionId,
    provider: adResult.provider,
    providerEventId: adResult.providerEventId,
    providerPayload: adResult.providerPayload
  });
}
