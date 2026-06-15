import type { AdPlacement } from "../../types/api";
import type { RewardedAdResult } from "./adProvider";

const GPT_SCRIPT_ID = "waves-google-publisher-tag";
const GPT_SCRIPT_SRC = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
const REWARDED_TIMEOUT_MS = 45_000;

type GptCommandQueue = Array<() => void>;

type GptPubAdsService = {
  addEventListener: (eventName: string, listener: (event: GptEvent) => void) => void;
  removeEventListener?: (eventName: string, listener: (event: GptEvent) => void) => void;
  enableSingleRequest?: () => void;
  collapseEmptyDivs?: () => void;
};

type GptSlot = {
  addService: (service: GptPubAdsService) => GptSlot;
};

type GptEvent = {
  slot?: GptSlot;
  isEmpty?: boolean;
  payload?: {
    amount?: number;
    type?: string;
  };
  makeRewardedVisible?: () => void;
};

type GoogleTag = {
  cmd: GptCommandQueue;
  defineSlot?: (adUnitPath: string, sizes: Array<[number, number]>, elementId: string) => GptSlot | null;
  defineOutOfPageSlot?: (adUnitPath: string, format: unknown) => GptSlot | null;
  destroySlots?: (slots?: GptSlot[]) => boolean;
  display: (slotOrElementId: GptSlot | string) => void;
  enableServices: () => void;
  enums?: {
    OutOfPageFormat?: {
      REWARDED?: unknown;
    };
  };
  pubads: () => GptPubAdsService;
};

declare global {
  interface Window {
    googletag?: GoogleTag;
  }
}

let gptScriptPromise: Promise<void> | null = null;
let gptServicesEnabled = false;

function getGoogleTag(): GoogleTag {
  if (!window.googletag) {
    window.googletag = { cmd: [] } as unknown as GoogleTag;
  }

  return window.googletag;
}

export function getGoogleAdManagerRewardedUnitPath() {
  return import.meta.env.VITE_GOOGLE_AD_MANAGER_REWARDED_AD_UNIT_PATH?.trim() ?? "";
}

export function getGoogleAdManagerBannerUnitPath() {
  return import.meta.env.VITE_GOOGLE_AD_MANAGER_BANNER_AD_UNIT_PATH?.trim() ?? "";
}

export function isGoogleAdManagerEnabled() {
  return import.meta.env.VITE_AD_PROVIDER === "google_ad_manager";
}

export function loadGooglePublisherTag(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Publisher Tag is only available in the browser."));
  }

  getGoogleTag();

  if (gptScriptPromise) {
    return gptScriptPromise;
  }

  const existingScript = document.getElementById(GPT_SCRIPT_ID) as HTMLScriptElement | null;
  if (existingScript) {
    gptScriptPromise = Promise.resolve();
    return gptScriptPromise;
  }

  gptScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = GPT_SCRIPT_ID;
    script.async = true;
    script.src = GPT_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Publisher Tag failed to load."));
    document.head.appendChild(script);
  });

  return gptScriptPromise;
}

async function runGptCommand<T>(callback: (googletag: GoogleTag) => T): Promise<T> {
  await loadGooglePublisherTag();

  return new Promise((resolve, reject) => {
    getGoogleTag().cmd.push(() => {
      try {
        resolve(callback(getGoogleTag()));
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Google Publisher Tag command failed."));
      }
    });
  });
}

function enableServicesOnce(googletag: GoogleTag) {
  if (gptServicesEnabled) {
    return;
  }

  const pubads = googletag.pubads();
  pubads.enableSingleRequest?.();
  pubads.collapseEmptyDivs?.();
  googletag.enableServices();
  gptServicesEnabled = true;
}

export async function displayGoogleAdManagerSlot(input: {
  adUnitPath: string;
  elementId: string;
  sizes: Array<[number, number]>;
}) {
  let slot: GptSlot | null = null;

  await runGptCommand((googletag) => {
    const element = document.getElementById(input.elementId);
    if (!element) {
      throw new Error("Google ad container was not found.");
    }

    slot = googletag.defineSlot?.(input.adUnitPath, input.sizes, input.elementId) ?? null;
    if (!slot) {
      throw new Error("Google display ad slot could not be created.");
    }

    slot.addService(googletag.pubads());
    enableServicesOnce(googletag);
    googletag.display(input.elementId);
  });

  return () => {
    if (!slot || !window.googletag?.destroySlots) {
      return;
    }

    window.googletag.cmd.push(() => {
      if (slot) {
        window.googletag?.destroySlots?.([slot]);
      }
    });
  };
}

export async function requestGoogleAdManagerRewardedAd(input: {
  placement: AdPlacement;
  adSessionId: string;
}): Promise<RewardedAdResult> {
  const adUnitPath = getGoogleAdManagerRewardedUnitPath();
  if (!adUnitPath) {
    throw new Error("Google Ad Manager rewarded ad unit is not configured.");
  }

  return new Promise((resolve, reject) => {
    let slot: GptSlot | null = null;
    let granted = false;
    let settled = false;
    let rewardPayload: GptEvent["payload"] | undefined;

    const finish = (handler: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      cleanupListeners();

      if (slot && window.googletag?.destroySlots) {
        window.googletag.cmd.push(() => {
          if (slot) {
            window.googletag?.destroySlots?.([slot]);
          }
        });
      }

      handler();
    };

    const eventBelongsToSlot = (event: GptEvent) => Boolean(slot && event.slot === slot);

    const readyHandler = (event: GptEvent) => {
      if (!eventBelongsToSlot(event)) {
        return;
      }
      event.makeRewardedVisible?.();
    };

    const grantedHandler = (event: GptEvent) => {
      if (!eventBelongsToSlot(event)) {
        return;
      }
      granted = true;
      rewardPayload = event.payload;
    };

    const closedHandler = (event: GptEvent) => {
      if (!eventBelongsToSlot(event)) {
        return;
      }

      finish(() => {
        if (!granted) {
          reject(new Error("Rewarded ad was closed before Google granted the reward."));
          return;
        }

        resolve({
          completed: true,
          provider: "google_ad_manager",
          providerEventId: `gam-${input.adSessionId}`,
          providerPayload: {
            placement: input.placement,
            googleReward: rewardPayload ?? null
          }
        });
      });
    };

    const renderEndedHandler = (event: GptEvent) => {
      if (!eventBelongsToSlot(event) || !event.isEmpty) {
        return;
      }

      finish(() => reject(new Error("Google did not return a rewarded ad for this request.")));
    };

    const cleanupListeners = () => {
      const pubads = window.googletag?.pubads?.();
      pubads?.removeEventListener?.("rewardedSlotReady", readyHandler);
      pubads?.removeEventListener?.("rewardedSlotGranted", grantedHandler);
      pubads?.removeEventListener?.("rewardedSlotClosed", closedHandler);
      pubads?.removeEventListener?.("slotRenderEnded", renderEndedHandler);
    };

    const timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error("Google rewarded ad timed out.")));
    }, REWARDED_TIMEOUT_MS);

    runGptCommand((googletag) => {
      const rewardedFormat = googletag.enums?.OutOfPageFormat?.REWARDED;
      if (!rewardedFormat || !googletag.defineOutOfPageSlot) {
        throw new Error("Google rewarded ads are not supported by this browser.");
      }

      slot = googletag.defineOutOfPageSlot(adUnitPath, rewardedFormat);
      if (!slot) {
        throw new Error("Google rewarded ads are only available on supported, mobile-optimized pages.");
      }

      const pubads = googletag.pubads();
      slot.addService(pubads);
      pubads.addEventListener("rewardedSlotReady", readyHandler);
      pubads.addEventListener("rewardedSlotGranted", grantedHandler);
      pubads.addEventListener("rewardedSlotClosed", closedHandler);
      pubads.addEventListener("slotRenderEnded", renderEndedHandler);
      enableServicesOnce(googletag);
      googletag.display(slot);
    }).catch((error) => {
      finish(() => reject(error instanceof Error ? error : new Error("Google rewarded ad failed.")));
    });
  });
}
