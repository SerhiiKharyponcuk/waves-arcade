import type { AdminAnalyticsDto, AdminAuditLogDto, AdminEmailVerificationDto, AdminPasswordResetDto, AdminUserDto, ModerationActionDto, RestrictionDto, RestrictionType, ScoreReviewDto, ScoreStatus, UserTrustStatus } from "../types/api";
import { apiRequest } from "./apiClient";

export const adminApi = {
  analytics() {
    return apiRequest<AdminAnalyticsDto>("/admin/analytics");
  },
  users(query = "") {
    const search = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
    return apiRequest<AdminUserDto[]>(`/admin/users${search}`);
  },
  banUser(userId: string, reason: string) {
    return apiRequest<AdminUserDto>(`/admin/users/${userId}/ban`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
  },
  unbanUser(userId: string, reason: string) {
    return apiRequest<AdminUserDto>(`/admin/users/${userId}/unban`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
  },
  thankUser(userId: string, message: string) {
    return apiRequest<ModerationActionDto>(`/admin/users/${userId}/thank`, {
      method: "POST",
      body: JSON.stringify({ message })
    });
  },
  resendEmailVerification(userId: string) {
    return apiRequest<AdminEmailVerificationDto>(`/admin/users/${userId}/email-verification/resend`, {
      method: "POST"
    });
  },
  verifyEmailManually(userId: string) {
    return apiRequest<AdminUserDto>(`/admin/users/${userId}/email-verification/approve`, {
      method: "POST"
    });
  },
  resetPassword(userId: string) {
    return apiRequest<AdminPasswordResetDto>(`/admin/users/${userId}/reset-password`, { method: "POST" });
  },
  resetScores(userId: string, reason: string) {
    return apiRequest<AdminUserDto>(`/admin/users/${userId}/reset-scores`, { method: "POST", body: JSON.stringify({ reason }) });
  },
  setTrust(userId: string, trustStatus: UserTrustStatus, reason: string) {
    return apiRequest<AdminUserDto>(`/admin/users/${userId}/trust`, { method: "POST", body: JSON.stringify({ trustStatus, reason }) });
  },
  createRestriction(userId: string, payload: { type: RestrictionType; reason: string; notes?: string; endsAt?: string | null }) {
    return apiRequest<RestrictionDto>(`/admin/users/${userId}/restrictions`, { method: "POST", body: JSON.stringify(payload) });
  },
  removeRestriction(restrictionId: string, reason: string) {
    return apiRequest<{ success: boolean }>(`/admin/restrictions/${restrictionId}`, { method: "DELETE", body: JSON.stringify({ reason }) });
  },
  scores(status: ScoreStatus | "all" = "pending_review") {
    return apiRequest<ScoreReviewDto[]>(`/admin/scores?status=${encodeURIComponent(status)}`);
  },
  moderateScore(scoreId: string, status: "valid" | "rejected" | "hidden", reason: string) {
    return apiRequest<ScoreReviewDto>(`/admin/scores/${scoreId}`, { method: "PATCH", body: JSON.stringify({ status, reason }) });
  },
  auditLogs() {
    return apiRequest<AdminAuditLogDto[]>("/admin/audit-logs");
  },
  guestTransfers() {
    return apiRequest<Array<{ id: string; userId: string; status: string; bestScore: number; transferredScore: number; reason?: string | null; metadata?: string | null; createdAt: string }>>("/admin/guest-transfers");
  }
};
