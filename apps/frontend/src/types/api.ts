import type {
  AuthResponseDto,
  AuthUserDto,
  EmailVerificationRequiredDto,
  AdPlacement,
  AdProvider,
  AdRewardCompleteDto,
  AdRewardSessionDto,
  DailyRewardDto,
  GameSessionEndRequestDto,
  GameSessionEndResponseDto,
  GameSessionCheckpointRequestDto,
  GameSessionCheckpointResponseDto,
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
  AdminEmailVerificationDto,
  ModerationActionDto,
  SupportTicketCategory,
  SupportTicketDto,
  SupportTicketSource,
  SupportTicketStatus,
  UserProfileDto,
  WalletDto,
  GuestTransferPayloadDto,
  GuestTransferResultDto,
  AdminAuditLogDto,
  AdminPasswordResetDto,
  RestrictionDto,
  RestrictionType,
  ScoreReviewDto,
  ScoreStatus,
  UserTrustStatus,
  AdminAnalyticsDto,
  ProgressionDto,
  FinancialTransactionDto
} from "@waves/shared";

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  locale: SupportedLocale;
  termsAccepted: boolean;
  captchaToken?: string;
  website?: string;
  formStartedAt?: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
  website?: string;
  formStartedAt?: number;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface VerifyEmailPayload {
  email: string;
  code: string;
}

export interface ResendVerificationPayload {
  email: string;
  website?: string;
  formStartedAt?: number;
}

export type AuthResponse = AuthResponseDto;
export type RegisterResponse = AuthResponseDto | EmailVerificationRequiredDto;
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
  GameSessionCheckpointRequestDto,
  GameSessionCheckpointResponseDto,
  GameSessionStartResponseDto,
  RouletteConfigDto,
  RouletteSpinDto,
  SubscriptionBenefitsDto,
  SupportedLocale,
  UserRole,
  UserStatus,
  AdminUserDto,
  AdminEmailVerificationDto,
  ModerationActionDto,
  SupportTicketCategory,
  SupportTicketDto,
  SupportTicketSource,
  SupportTicketStatus,
  UserProfileDto,
  WalletDto,
  GuestTransferPayloadDto,
  GuestTransferResultDto,
  AdminAuditLogDto,
  AdminPasswordResetDto,
  RestrictionDto,
  RestrictionType,
  ScoreReviewDto,
  ScoreStatus,
  UserTrustStatus,
  AdminAnalyticsDto,
  ProgressionDto,
  FinancialTransactionDto
};
