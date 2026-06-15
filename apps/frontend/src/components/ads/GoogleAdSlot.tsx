import { useEffect, useMemo, useState } from "react";
import {
  displayGoogleAdManagerSlot,
  getGoogleAdManagerBannerUnitPath,
  isGoogleAdManagerEnabled
} from "../../services/ads/googlePublisherTag";

const BANNER_SIZES: Array<[number, number]> = [
  [320, 50],
  [300, 250],
  [728, 90]
];

export function GoogleAdSlot() {
  const [slotId] = useState(() => `waves-gam-slot-${Math.random().toString(36).slice(2)}`);
  const [failed, setFailed] = useState(false);
  const adUnitPath = useMemo(() => getGoogleAdManagerBannerUnitPath(), []);
  const enabled = isGoogleAdManagerEnabled() && Boolean(adUnitPath);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setFailed(false);
    let destroySlot: (() => void) | undefined;
    let cancelled = false;

    void displayGoogleAdManagerSlot({
      adUnitPath,
      elementId: slotId,
      sizes: BANNER_SIZES
    })
      .then((destroy) => {
        if (cancelled) {
          destroy();
          return;
        }
        destroySlot = destroy;
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
        destroySlot = undefined;
      });

    return () => {
      cancelled = true;
      destroySlot?.();
    };
  }, [adUnitPath, enabled, slotId]);

  if (!enabled || failed) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-md border border-white/10 bg-black/20 px-2 py-2">
      <div id={slotId} className="mx-auto flex min-h-[50px] w-full max-w-[728px] items-center justify-center sm:min-h-[90px]" />
    </div>
  );
}
