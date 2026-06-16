import { z } from "zod";

export const localeSchema = z.enum(["en", "nl", "ru", "uk"]);

export const registerSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(160, "Email is too long."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long."),
  displayName: z.string().trim().min(3, "Display name must be at least 3 characters.").max(24, "Display name is too long."),
  locale: localeSchema.catch("en")
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(160, "Email is too long."),
  password: z.string().min(1).max(128)
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(3, "Display name must be at least 3 characters.").max(24, "Display name is too long.").optional(),
  locale: localeSchema.catch("en").optional(),
  avatarUrl: z.string().url().nullable().optional()
});

export const gameSessionEndSchema = z.object({
  sessionId: z.string().uuid(),
  score: z.number().int().min(0).max(5_000_000),
  coinsCollected: z.number().int().min(0).max(5_000),
  distance: z.number().int().min(0).max(10_000_000),
  durationMs: z.number().int().min(0).max(900_000),
  obstacleHits: z.number().int().min(0).max(100),
  clientChecksum: z.string().max(128).default("")
});

export const skinMutationSchema = z.object({
  skinId: z.string().uuid()
});

export const purchasePlaceholderSchema = z.object({
  sku: z.string().min(3).max(80),
  amountCents: z.number().int().positive().max(50_000),
  currency: z.enum(["USD", "EUR"]),
  provider: z.enum(["stripe", "google_play", "apple_iap", "placeholder"]).default("placeholder")
});

export const rouletteSpinSchema = z.object({
  adsWatched: z.number().int().min(0).max(20).default(0)
});

export const adRewardSchema = z.object({
  placement: z.enum(["coins", "roulette", "continue"]).default("coins"),
  provider: z.enum(["mock", "crazygames", "admob", "unity", "google_ad_manager"]).optional()
});

export const adRewardCompleteSchema = z.object({
  adSessionId: z.string().uuid(),
  provider: z.enum(["mock", "crazygames", "admob", "unity", "google_ad_manager"]).optional(),
  providerEventId: z.string().trim().max(160).optional(),
  providerPayload: z.record(z.unknown()).optional()
});
