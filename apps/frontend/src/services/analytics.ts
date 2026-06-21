import { apiRequest } from "./apiClient";
import { useConsentStore } from "../store/consentStore";
import { useGuestStore } from "../store/guestStore";

type AnalyticsEvent = "app_open" | "guest_session_start" | "login_success" | "registration_success" | "game_start" | "game_complete" | "shop_view" | "ad_view" | "ad_reward_complete" | "account_deleted" | "client_error";
const sessionKey = crypto.randomUUID();

export function trackEvent(eventType: AnalyticsEvent, metadata?: Record<string, string | number | boolean | null>) {
  if (!useConsentStore.getState().analytics) return;
  const guestId = useGuestStore.getState().session?.guestId;
  void apiRequest("/analytics/events", {
    method: "POST",
    body: JSON.stringify({ eventType, guestId, sessionKey, metadata })
  }).catch(() => undefined);
}
