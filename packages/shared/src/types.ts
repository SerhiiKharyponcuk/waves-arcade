export type SupportedLocale = "en" | "nl" | "ru" | "uk";

export type SkinRarity = "common" | "rare" | "epic" | "legendary" | "premium" | "limited" | "event";

export type SkinCategory = "player" | "arrow" | "trail" | "line" | "effect" | "hitEffect" | "coinEffect" | "background" | "deathEffect" | "profileAvatar" | "profileFrame" | "badge";

export type CustomizationUnlockType = "free" | "score" | "coins" | "reward_ad" | "premium" | "admin_granted";

export type CurrencyCode = "coins" | "gems";

export type ThemeType = "free" | "unlockable" | "premium";

export interface GameThemeDto {
  id: string;
  name: string;
  type: ThemeType;
  backgroundStyle: string;
  playerTrailStyle: string;
  obstacleStyle: string;
  uiAccentColor: string;
  particleStyle: string;
  unlockCondition: string;
  priceCoins: number;
}

export type AdPlacement = "coins" | "roulette" | "continue";

export type AdProvider = "mock" | "crazygames" | "admob" | "unity" | "google_ad_manager";

export type UserRole = "PLAYER" | "ADMIN";

export type UserStatus = "ACTIVE" | "BANNED" | "DELETED";

export type ScoreStatus = "valid" | "suspicious" | "pending_review" | "rejected" | "hidden";

export type UserTrustStatus = "NORMAL" | "TRUSTED" | "SUSPICIOUS";

export type RestrictionType = "warning" | "temporary_restriction" | "support_restriction" | "shop_restriction" | "leaderboard_restriction" | "score_reset" | "score_hidden" | "rewards_removed" | "temporary_ban" | "permanent_ban";

export type ModerationActionType = "BAN" | "UNBAN" | "THANK" | "CHEAT_FLAG" | "EMAIL_VERIFY";

export type SupportTicketStatus = "OPEN" | "ANSWERED" | "CLOSED";

export type SupportTicketCategory = "BUG" | "BAN_APPEAL" | "APPEAL" | "ACCOUNT" | "SCORE" | "PAYMENT" | "SHOP" | "OTHER";

export type SupportTicketSource = "ACCOUNT" | "GUEST";

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
  unlockType?: CustomizationUnlockType;
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

export interface FinancialTransactionDto {
  id: string;
  userId: string;
  userEmail: string;
  displayName: string;
  type: string;
  status: string;
  provider: string;
  productLabel: string;
  skinId?: string | null;
  skinNameKey?: string | null;
  amountCoins: number;
  amountGems: number;
  amountTickets: number;
  amountExtraLives: number;
  idempotencyKey?: string | null;
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
  selectedThemeId: string;
  customization: Record<string, string>;
  gameSettings: Record<string, unknown>;
  showUsernameInLeaderboard: boolean;
  hideProfile: boolean;
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
  emailVerifiedAt?: string | null;
  mustChangePassword: boolean;
  temporaryPasswordUsed: boolean;
  lastPasswordChangeAt: string;
  trustStatus: UserTrustStatus;
  profile: UserProfileDto;
  wallet: WalletDto;
  ownedSkins: OwnedSkinDto[];
  subscription: SubscriptionStatusDto;
  moderationNotices: ModerationActionDto[];
  activeRestrictions: RestrictionDto[];
  ownedThemes: string[];
}

export interface AuthResponseDto {
  user: AuthUserDto;
  accessToken: string;
}

export interface EmailVerificationRequiredDto {
  success: true;
  emailVerificationRequired: true;
  email: string;
  emailSent: boolean;
  devCode?: string;
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

export interface GameSessionCheckpointRequestDto {
  sessionId: string;
  sequence: number;
  elapsedMs: number;
  distance: number;
  coinsCollected: number;
  inputTransitions: number;
}

export interface GameSessionCheckpointResponseDto {
  accepted: boolean;
  sequence: number;
  serverReceivedAt: string;
}

export interface GameSessionEndResponseDto {
  accepted: boolean;
  status: ScoreStatus;
  reviewReason?: string;
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

export interface ScoreReviewDto {
  id: string;
  userId: string;
  displayName: string;
  sessionId?: string | null;
  score: number;
  distance: number;
  durationMs: number;
  status: ScoreStatus;
  reviewReason?: string | null;
  createdAt: string;
  session?: {
    startedAt: string;
    endedAt?: string | null;
    coinsCollected: number;
    obstacleHits: number;
    antiCheatNotes?: string | null;
  } | null;
}

export interface RestrictionDto {
  id: string;
  userId: string;
  type: RestrictionType;
  reason: string;
  notes?: string | null;
  startsAt: string;
  endsAt?: string | null;
  active: boolean;
  appealPossible: boolean;
}

export interface AdminAuditLogDto {
  id: string;
  adminId?: string | null;
  adminEmail?: string | null;
  actionType: string;
  targetUserId?: string | null;
  targetEntityId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface GuestTransferPayloadDto {
  guestId: string;
  gamesPlayed: number;
  bestGuestScore: number;
  selectedBasicTheme: string;
  selectedBasicSkin?: string;
  selectedBasicControls: Record<string, unknown>;
  temporarySettings: Record<string, unknown>;
  temporaryCoins?: number;
}

export interface GuestTransferResultDto {
  status: "accepted" | "partial" | "rejected";
  transferredScore: number;
  selectedThemeId: string;
  reason?: string;
  user: AuthUserDto;
}

export interface AchievementProgressDto {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  unlocked: boolean;
  unlockedAt?: string | null;
}

export interface DailyMissionDto {
  id: string;
  title: string;
  progress: number;
  target: number;
  completed: boolean;
  rewardCoins: number;
}

export interface SeasonProgressDto {
  seasonId: string;
  name: string;
  xp: number;
  level: number;
  xpForNextLevel: number;
  premium: boolean;
}

export interface ProgressionDto {
  achievements: AchievementProgressDto[];
  dailyMissions: DailyMissionDto[];
  season: SeasonProgressDto;
}

export interface AdminAnalyticsDto {
  registeredUsers: number;
  registeredLast7Days: number;
  activePlayers7Days: number;
  gameSessions30Days: number;
  validScores30Days: number;
  completedAdViews30Days: number;
  guestUsers30Days: number;
  returningPlayers7Days: number;
  activityTimeline: AdminActivityDayDto[];
  generatedAt: string;
}

export interface AdminActivityDayDto {
  date: string;
  label: string;
  gameSessions: number;
  validScores: number;
  adViews: number;
  newUsers: number;
  guestSessions: number;
  clientErrors: number;
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
  emailVerifiedAt?: string | null;
  bannedAt?: string | null;
  banReason?: string | null;
  lastAction?: ModerationActionDto | null;
  mustChangePassword: boolean;
  lastPasswordChangeAt: string;
  trustStatus: UserTrustStatus;
  activeRestrictions: RestrictionDto[];
}

export interface AdminPasswordResetDto {
  temporaryPassword: string;
  user: AdminUserDto;
}

export interface AdminEmailVerificationDto {
  user: AdminUserDto;
  emailSent: boolean;
}

export interface SupportTicketDto {
  id: string;
  userId?: string | null;
  userEmail?: string;
  displayName?: string;
  source: SupportTicketSource;
  adminEmail?: string | null;
  category: SupportTicketCategory;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  adminResponse?: string | null;
  relatedEntityId?: string | null;
  internalNote?: string | null;
  appealStatus?: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}

export interface ApiErrorDto {
  message: string;
  code?: string;
  fields?: Record<string, string[]>;
}
