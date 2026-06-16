export type SupportedLocale = "en" | "nl" | "ru" | "uk";

export type SkinRarity = "common" | "rare" | "epic" | "legendary" | "premium" | "limited" | "event";

export type SkinCategory = "arrow" | "trail" | "line" | "effect" | "background" | "deathEffect" | "profileFrame" | "badge";

export type CurrencyCode = "coins" | "gems";

export type AdPlacement = "coins" | "roulette" | "continue";

export type AdProvider = "mock" | "crazygames" | "admob" | "unity" | "google_ad_manager";

export type UserRole = "PLAYER" | "ADMIN";

export type UserStatus = "ACTIVE" | "BANNED";

export type ModerationActionType = "BAN" | "UNBAN" | "THANK" | "CHEAT_FLAG";

export type SupportTicketStatus = "OPEN" | "ANSWERED" | "CLOSED";

export type SupportTicketCategory = "BUG" | "BAN_APPEAL" | "ACCOUNT" | "PAYMENT" | "SHOP" | "OTHER";

export interface SkinVisualConfig {
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  particleColor: string;
  trailTexture: "solid" | "fire" | "ice" | "galaxy" | "rainbow" | "shadow" | "diamond";
}

export interface SkinDto {
  id: string;
  slug: string;
  nameKey: string;
  descriptionKey: string;
  category: SkinCategory;
  rarity: SkinRarity;
  priceCoins: number;
  priceGems: number;
  isPremium: boolean;
  isLimited: boolean;
  visual: SkinVisualConfig;
}

export interface OwnedSkinDto {
  skinId: string;
  ownedAt: string;
  equipped: boolean;
}

export interface WalletDto {
  coins: number;
  gems: number;
  lifetimeCoins: number;
  rouletteTickets: number;
  extraLives: number;
}

export interface SubscriptionStatusDto {
  status: "free" | "premium_active" | "premium_expired" | "trial_active" | "canceled";
  plan: "standard" | "premium" | "vip" | "trial";
  provider: string | null;
  startDate: string | null;
  endDate: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface DailyRewardDto {
  canClaim: boolean;
  streak: number;
  rewardCoins: number;
  rewardGems: number;
  rewardTickets: number;
  rewardLives: number;
  premiumBonus: boolean;
  nextClaimAt?: string;
}

export interface RouletteConfigDto {
  freeDailySpins: number;
  premiumExtraSpins: number;
  cooldownSeconds: number;
  nextSpinCostAds: number;
  probabilities: Record<string, number>;
  categories: RouletteCategoryDto[];
}

export interface RouletteSpinDto {
  id: string;
  rewardType: "coins" | "gems" | "rouletteTicket" | "extraLife" | "skin" | "premiumTrial" | "booster" | "antiAds";
  rewardAmount: number;
  rewardSkinId?: string;
  rewardSkin?: SkinDto;
  rarity?: SkinRarity;
  createdAt: string;
}

export interface RouletteCategoryDto {
  label: string;
  color: string;
  rarity: SkinRarity;
  rewardType: RouletteSpinDto["rewardType"];
  displayValue: string;
}

export interface AdRewardDto {
  id: string;
  provider: string;
  placement: AdPlacement;
  rewardType: "coins" | "gems" | "extraLife" | "rouletteTicket" | "booster" | "antiAds";
  rewardAmount: number;
  status: "pending" | "completed" | "skipped" | "failed";
  createdAt: string;
}

export interface AdRewardSessionDto {
  adSessionId: string;
  provider: AdProvider;
  placement: AdPlacement;
  rewardType: AdRewardDto["rewardType"];
  rewardAmount: number;
  expiresAt: string;
}

export interface AdRewardCompleteDto {
  wallet: WalletDto;
  reward: {
    type: AdRewardDto["rewardType"];
    amount: number;
  };
  adReward: AdRewardDto;
}

export interface WalletTransactionDto {
  id: string;
  type: "GAME_REWARD" | "SHOP_PURCHASE" | "ROULETTE_REWARD" | "AD_REWARD" | "DAILY_REWARD" | "PREMIUM_BONUS" | "EXTRA_LIFE_USED" | "ADMIN_GRANT" | "PURCHASE_PLACEHOLDER";
  provider: string;
  amountCoins: number;
  amountGems: number;
  amountTickets: number;
  amountExtraLives: number;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface SubscriptionBenefitsDto {
  premiumOnlySkins: number;
  extraDailySpins: number;
  extraDailyGems: number;
  extraLivesPerRun: number;
  noAds: boolean;
  premiumBadge: string;
  betterDailyRewards: boolean;
}

export interface BundleDto {
  id: string;
  titleKey: string;
  descriptionKey: string;
  priceCoins: number;
  priceGems: number;
  coins: number;
  gems: number;
  tickets: number;
  extraLives: number;
  discountPercent: number;
  featured: boolean;
  premiumOnly: boolean;
}

export interface UserProfileDto {
  id: string;
  displayName: string;
  locale: SupportedLocale;
  avatarUrl?: string | null;
  highScore: number;
  selectedArrowSkinId?: string | null;
  selectedTrailSkinId?: string | null;
  createdAt: string;
}

export interface AuthUserDto {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  banReason?: string | null;
  bannedAt?: string | null;
  termsAcceptedAt?: string | null;
  profile: UserProfileDto;
  wallet: WalletDto;
  ownedSkins: OwnedSkinDto[];
  subscription: SubscriptionStatusDto;
  moderationNotices: ModerationActionDto[];
}

export interface AuthResponseDto {
  user: AuthUserDto;
  accessToken: string;
}

export interface GameSessionStartResponseDto {
  sessionId: string;
  seed: string;
  serverStartedAt: string;
}

export interface GameSessionEndRequestDto {
  sessionId: string;
  score: number;
  coinsCollected: number;
  distance: number;
  durationMs: number;
  obstacleHits: number;
  clientChecksum: string;
}

export interface GameSessionEndResponseDto {
  accepted: boolean;
  score: number;
  coinsAwarded: number;
  newHighScore: boolean;
  wallet: WalletDto;
}

export interface LeaderboardEntryDto {
  scoreId?: string;
  userId: string;
  displayName: string;
  score: number;
  rank: number;
  achievedAt: string;
}

export interface ModerationActionDto {
  id: string;
  action: ModerationActionType;
  reason?: string | null;
  message?: string | null;
  createdAt: string;
  adminEmail?: string | null;
}

export interface AdminUserDto {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  displayName: string;
  highScore: number;
  coins: number;
  createdAt: string;
  bannedAt?: string | null;
  banReason?: string | null;
  lastAction?: ModerationActionDto | null;
}

export interface SupportTicketDto {
  id: string;
  userId: string;
  userEmail?: string;
  displayName?: string;
  adminEmail?: string | null;
  category: SupportTicketCategory;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  adminResponse?: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}

export interface ApiErrorDto {
  message: string;
  code?: string;
  fields?: Record<string, string[]>;
}
