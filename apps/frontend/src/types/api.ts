import type {
  AuthResponseDto,
  AuthUserDto,
  AdPlacement,
  AdProvider,
  AdRewardCompleteDto,
  AdRewardSessionDto,
  DailyRewardDto,
  GameSessionEndRequestDto,
  GameSessionEndResponseDto,
  GameSessionStartResponseDto,
  LeaderboardEntryDto,
  RouletteConfigDto,
  RouletteSpinDto,
  SubscriptionBenefitsDto,
  SkinDto,
  SupportedLocale,
  UserRole,
  UserStatus,
  AdminUserDto,
  ModerationActionDto,
  SupportTicketCategory,
  SupportTicketDto,
  SupportTicketStatus,
  UserProfileDto,
  WalletDto
} from "@waves/shared";

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  locale: SupportedLocale;
  termsAccepted: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export type AuthResponse = AuthResponseDto;
export type CurrentUser = AuthUserDto;

export type ShopSkin = SkinDto & {
  owned: boolean;
  equipped: boolean;
  ownedAt?: string;
};

export interface LeaderboardResponse {
  global: LeaderboardEntryDto[];
  weeklyPlaceholder: LeaderboardEntryDto[];
  myBest: { highScore: number } | null;
}

export type {
  AdPlacement,
  AdProvider,
  AdRewardCompleteDto,
  AdRewardSessionDto,
  DailyRewardDto,
  GameSessionEndRequestDto,
  GameSessionEndResponseDto,
  GameSessionStartResponseDto,
  RouletteConfigDto,
  RouletteSpinDto,
  SubscriptionBenefitsDto,
  SupportedLocale,
  UserRole,
  UserStatus,
  AdminUserDto,
  ModerationActionDto,
  SupportTicketCategory,
  SupportTicketDto,
  SupportTicketStatus,
  UserProfileDto,
  WalletDto
};
