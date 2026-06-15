import type { AuthResponse, CurrentUser, LoginPayload, RegisterPayload, UserProfileDto } from "../types/api";
import { apiRequest } from "./apiClient";

export const authApi = {
  register(payload: RegisterPayload) {
    return apiRequest<AuthResponse>("/auth/register", {
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
  logout() {
    return apiRequest<{ success: boolean }>("/auth/logout", {
      method: "POST"
    });
  },
  me() {
    return apiRequest<CurrentUser>("/auth/me");
  },
  updateProfile(payload: Partial<Pick<UserProfileDto, "displayName" | "locale" | "avatarUrl">>) {
    return apiRequest<UserProfileDto>("/user/profile", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }
};
