import type { AdminUserDto, ModerationActionDto } from "../types/api";
import { apiRequest } from "./apiClient";

export const adminApi = {
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
  }
};
