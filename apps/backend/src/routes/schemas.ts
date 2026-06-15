import { z } from "zod";

export const localeSchema = z.enum(["en", "nl", "ru", "uk"]);

export const registerSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(3).max(24),
  locale: localeSchema.default("en")
});

export const loginSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(1).max(128)
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(3).max(24).optional(),
  locale: localeSchema.optional(),
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
