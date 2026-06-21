import type {
  AuthResponse,
  CurrentUser,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
  ResendVerificationPayload,
  ResetPasswordPayload,
  UserProfileDto,
  VerifyEmailPayload,
  GuestTransferPayloadDto,
  GuestTransferResultDto
} from "../types/api";
import { apiRequest } from "./apiClient";

export const authApi = {
  register(payload: RegisterPayload) {
    return apiRequest<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  login(payload: LoginPayload) {
    return apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  forgotPassword(payload: ForgotPasswordPayload) {
    return apiRequest<{ success: boolean; emailSent?: boolean; resetUrl?: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  resetPassword(payload: ResetPasswordPayload) {
    return apiRequest<{ success: boolean }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  verifyEmail(payload: VerifyEmailPayload) {
    return apiRequest<AuthResponse>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  resendVerification(payload: ResendVerificationPayload) {
    return apiRequest<RegisterResponse>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  logout() {
    return apiRequest<{ success: boolean }>("/auth/logout", {
      method: "POST"
    });
  },
  me() {
    return apiRequest<CurrentUser>("/auth/me");
  },
  progression() {
    return apiRequest<import("../types/api").ProgressionDto>("/user/progression");
  },
  transferGuestProgress(payload: GuestTransferPayloadDto) {
    return apiRequest<GuestTransferResultDto>("/auth/guest-transfer", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  changePassword(payload: { currentPassword?: string; newPassword: string; confirmPassword: string }) {
    return apiRequest<{ success: boolean; lastPasswordChangeAt: string }>("/user/password", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  deleteAccount(payload: { password: string; confirmation: "DELETE" }) {
    return apiRequest<{ success: boolean }>("/user/account", { method: "DELETE", body: JSON.stringify(payload) });
  },
  updateProfile(payload: Partial<Pick<UserProfileDto, "displayName" | "locale" | "avatarUrl" | "selectedThemeId" | "customization" | "gameSettings" | "showUsernameInLeaderboard" | "hideProfile">>) {
    return apiRequest<UserProfileDto>("/user/profile", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }
};
