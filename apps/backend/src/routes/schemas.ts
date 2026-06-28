import { z } from "zod";

export const localeSchema = z.enum(["en", "nl", "ru", "uk"]);

const botGuardSchema = {
  website: z.string().max(0, "Bot check failed.").optional().default(""),
  formStartedAt: z.number().int().positive().optional()
};

function rejectFastBots(value: { website?: string; formStartedAt?: number }, context: z.RefinementCtx) {
  if (value.website) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["website"], message: "Bot check failed." });
  }
  if (value.formStartedAt && Date.now() - value.formStartedAt < 1_200) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["formStartedAt"], message: "Please wait a moment before submitting." });
  }
}

export const registerSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(160, "Email is too long."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long."),
  displayName: z.string().trim().min(3, "Display name must be at least 3 characters.").max(24, "Display name is too long."),
  locale: localeSchema.catch("en"),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "Terms of use must be accepted." })
  }),
  captchaToken: z.string().trim().min(10).max(4_096).optional(),
  ...botGuardSchema
}).superRefine(rejectFastBots);

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(160, "Email is too long."),
  password: z.string().min(1).max(128)
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(3, "Display name must be at least 3 characters.").max(24, "Display name is too long.").optional(),
  locale: localeSchema.catch("en").optional(),
  avatarUrl: z.string().url().nullable().optional(),
  selectedThemeId: z.string().trim().min(2).max(60).optional(),
  customization: z.record(z.string().max(80)).optional(),
  gameSettings: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  showUsernameInLeaderboard: z.boolean().optional(),
  hideProfile: z.boolean().optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().max(128).optional(),
  newPassword: z.string().min(10).max(128),
  confirmPassword: z.string().min(10).max(128)
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "New password and confirmation must match."
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

export const gameSessionCheckpointSchema = z.object({
  sessionId: z.string().uuid(),
  sequence: z.number().int().min(1).max(500),
  elapsedMs: z.number().int().min(0).max(900_000),
  distance: z.number().int().min(0).max(10_000_000),
  coinsCollected: z.number().int().min(0).max(5_000),
  inputTransitions: z.number().int().min(0).max(20_000)
});

export const skinMutationSchema = z.object({
  skinId: z.string().uuid()
});

export const themeMutationSchema = z.object({ themeId: z.string().trim().min(2).max(60) });

export const purchasePlaceholderSchema = z.object({
  sku: z.string().min(3).max(80),
  amountCents: z.number().int().positive().max(50_000),
  currency: z.enum(["USD", "EUR"]),
  provider: z.enum(["stripe", "mollie", "paypal", "adyen", "google_play", "apple_iap", "placeholder"]).default("placeholder"),
  idempotencyKey: z.string().trim().min(8).max(160)
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

export const adminBanSchema = z.object({
  reason: z.string().trim().min(3, "Reason must be at least 3 characters.").max(500, "Reason is too long.")
});

export const adminThankSchema = z.object({
  message: z.string().trim().min(3, "Message must be at least 3 characters.").max(500, "Message is too long.")
});

export const adminScoreModerationSchema = z.object({
  status: z.enum(["valid", "rejected", "hidden"]),
  reason: z.string().trim().min(3).max(500)
});

export const adminTrustSchema = z.object({
  trustStatus: z.enum(["TRUSTED", "SUSPICIOUS", "NORMAL"]),
  reason: z.string().trim().min(3).max(500)
});

export const adminRestrictionSchema = z.object({
  type: z.enum(["warning", "temporary_restriction", "support_restriction", "shop_restriction", "leaderboard_restriction", "score_reset", "score_hidden", "rewards_removed", "temporary_ban", "permanent_ban"]),
  reason: z.string().trim().min(3).max(500),
  notes: z.string().trim().max(1_000).optional(),
  endsAt: z.string().datetime().nullable().optional()
});

export const supportTicketSchema = z.object({
  category: z.enum(["BUG", "BAN_APPEAL", "APPEAL", "ACCOUNT", "SCORE", "PAYMENT", "SHOP", "OTHER"]).default("OTHER"),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters.").max(120, "Subject is too long."),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(2_000, "Message is too long."),
  relatedEntityId: z.string().trim().max(100).optional(),
  ...botGuardSchema
}).superRefine(rejectFastBots);

export const publicSupportTicketSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(160, "Email is too long."),
  displayName: z.string().trim().max(60, "Name is too long.").optional().default(""),
  category: z.enum(["BUG", "BAN_APPEAL", "APPEAL", "ACCOUNT", "SCORE", "PAYMENT", "SHOP", "OTHER"]).default("ACCOUNT"),
  relatedEntityId: z.string().trim().max(100).optional(),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters.").max(120, "Subject is too long."),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(2_000, "Message is too long."),
  ...botGuardSchema
}).superRefine(rejectFastBots);

export const adminSupportTicketSchema = z.object({
  status: z.enum(["OPEN", "ANSWERED", "CLOSED"]).optional(),
  adminResponse: z.string().trim().min(3, "Response must be at least 3 characters.").max(2_000, "Response is too long.").optional(),
  internalNote: z.string().trim().max(2_000).optional(),
  appealStatus: z.enum(["UNDER_REVIEW", "UPHELD", "REMOVED", "RESTORED", "REJECTED"]).optional()
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(160, "Email is too long."),
  ...botGuardSchema
}).superRefine(rejectFastBots);

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(40, "Reset token is invalid.").max(200, "Reset token is invalid."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long.")
});

export const verifyEmailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(160, "Email is too long."),
  code: z.string().trim().regex(/^\d{6}$/, "Verification code must be 6 digits.")
});

export const guestTransferSchema = z.object({
  guestId: z.string().trim().min(8).max(100),
  gamesPlayed: z.number().int().min(0).max(100_000),
  bestGuestScore: z.number().int().min(0).max(5_000_000),
  selectedBasicTheme: z.string().trim().min(2).max(60),
  selectedBasicSkin: z.string().trim().max(60).optional(),
  selectedBasicControls: z.record(z.unknown()),
  temporarySettings: z.record(z.unknown()),
  temporaryCoins: z.number().int().min(0).max(100_000).optional()
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(160, "Email is too long."),
  ...botGuardSchema
}).superRefine(rejectFastBots);

export const analyticsEventSchema = z.object({
  guestId: z.string().trim().min(8).max(100).optional(),
  eventType: z.enum(["app_open", "guest_session_start", "login_success", "registration_success", "game_start", "game_complete", "shop_view", "ad_view", "ad_reward_complete", "account_deleted", "client_error"]),
  sessionKey: z.string().trim().max(100).optional(),
  metadata: z.record(z.union([z.string().max(120), z.number(), z.boolean(), z.null()])).optional()
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(128),
  confirmation: z.literal("DELETE")
});
