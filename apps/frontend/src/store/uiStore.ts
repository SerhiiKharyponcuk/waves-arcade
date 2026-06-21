import { create } from "zustand";

export type AppView = "play" | "shop" | "inventory" | "themes" | "premium" | "profile" | "support" | "settings" | "rules" | "privacy" | "cookies" | "admin";

interface UiState {
  view: AppView;
  setView: (view: AppView) => void;
}

export const useUiStore = create<UiState>((set) => ({
  view: "play",
  setView: (view) => set({ view })
}));
