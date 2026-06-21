import { create } from "zustand";
import type { AuthResponse, CurrentUser, LoginPayload, RegisterPayload, RegisterResponse, UserProfileDto, VerifyEmailPayload, WalletDto } from "../types/api";
import { authApi } from "../services/authApi";
import { setAccessToken } from "../services/apiClient";
import { trackEvent } from "../services/analytics";

interface AuthState {
  token: string;
  user: CurrentUser | null;
  loading: boolean;
  error: string;
  bootstrap: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<RegisterResponse | null>;
  verifyEmail: (payload: VerifyEmailPayload) => Promise<void>;
  logout: () => Promise<void>;
  patchProfile: (profile: UserProfileDto) => void;
  patchWallet: (wallet: WalletDto) => void;
  replaceUser: (user: CurrentUser) => void;
}

function applyAuthResponse(result: AuthResponse) {
  setAccessToken(result.accessToken);
  return { token: result.accessToken, user: result.user, error: "" };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem("waves_access_token") ?? "",
  user: null,
  loading: false,
  error: "",
  bootstrap: async () => {
    const token = get().token;
    if (!token || get().user) {
      return;
    }
    setAccessToken(token);
    set({ loading: true });
    try {
      const user = await authApi.me();
      set({ user, loading: false, error: "" });
    } catch {
      setAccessToken("");
      set({ token: "", user: null, loading: false });
    }
  },
  login: async (payload) => {
    set({ loading: true, error: "" });
    try {
      const result = await authApi.login(payload);
      set({ ...applyAuthResponse(result), loading: false });
      trackEvent("login_success");
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "Login failed" });
    }
  },
  register: async (payload) => {
    set({ loading: true, error: "" });
    try {
      const result = await authApi.register(payload);
      if ("accessToken" in result) {
        set({ ...applyAuthResponse(result), loading: false });
        trackEvent("registration_success");
      } else {
        set({ loading: false, error: "" });
      }
      return result;
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "Registration failed" });
      return null;
    }
  },
  verifyEmail: async (payload) => {
    set({ loading: true, error: "" });
    try {
      const result = await authApi.verifyEmail(payload);
      set({ ...applyAuthResponse(result), loading: false });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "Email verification failed" });
    }
  },
  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Stateless JWT logout is completed client-side even if the token has expired.
    }
    setAccessToken("");
    set({ token: "", user: null });
  },
  patchProfile: (profile) => {
    const user = get().user;
    if (user) {
      set({ user: { ...user, profile } });
    }
  },
  patchWallet: (wallet) => {
    const user = get().user;
    if (user) {
      set({ user: { ...user, wallet } });
    }
  },
  replaceUser: (user) => set({ user })
}));
