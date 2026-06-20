import type { CurrentUser } from "../../types/api";
import type { GuestAdEvent, GuestSession } from "../../types/guest";

const AD_COOLDOWN_MS = 90_000;
const GAMES_BEFORE_NEXT_AD = 3;

export function isGuestUser(user: CurrentUser | null | undefined) {
  return !user;
}

export function getAdCooldown() {
  return AD_COOLDOWN_MS;
}

export function getGamesBeforeNextAd() {
  return GAMES_BEFORE_NEXT_AD;
}

export function canShowAd(session: GuestSession, now = Date.now()) {
  if (!session.lastAdShownAt) {
    return true;
  }

  const lastShownAt = Date.parse(session.lastAdShownAt);
  if (!Number.isFinite(lastShownAt) || lastShownAt > now + 5 * 60_000) {
    return true;
  }
  return now - lastShownAt >= AD_COOLDOWN_MS;
}

export function shouldShowGuestAd(eventType: GuestAdEvent, session: GuestSession) {
  if (!canShowAd(session)) {
    return false;
  }

  if (eventType === "game_over" || eventType === "round_threshold") {
    return session.gamesPlayed > 0 && session.gamesPlayed % GAMES_BEFORE_NEXT_AD === 0;
  }

  return eventType === "restart" || eventType === "save_score" || eventType === "open_shop" || eventType === "open_skins" || eventType === "claim_reward";
}

export function recordAdShown(session: GuestSession): GuestSession {
  return {
    ...session,
    adsShownCount: session.adsShownCount + 1,
    lastAdShownAt: new Date().toISOString()
  };
}
