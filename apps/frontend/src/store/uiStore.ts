import { create } from "zustand";

export type AppView = "play" | "shop" | "inventory" | "themes" | "premium" | "payment" | "profile" | "support" | "settings" | "rules" | "about" | "privacy" | "cookies" | "admin";

interface UiState {
  view: AppView;
  setView: (view: AppView) => void;
}

export const useUiStore = create<UiState>((set) => ({
  view: "play",
  setView: (view) => set({ view })
}));
