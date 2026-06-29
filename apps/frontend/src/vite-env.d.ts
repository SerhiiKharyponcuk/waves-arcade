/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GAME_BUILD?: string;
  readonly VITE_PAYMENTS_ENABLED?: "true" | "false";
  readonly VITE_AD_PROVIDER?: "mock" | "crazygames" | "admob" | "unity" | "google_ad_manager";
  readonly VITE_ADS_ENABLED?: "true" | "false";
  readonly VITE_GOOGLE_AD_MANAGER_REWARDED_AD_UNIT_PATH?: string;
  readonly VITE_GOOGLE_AD_MANAGER_BANNER_AD_UNIT_PATH?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_GOOGLE_PRIVACY_MESSAGING_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
