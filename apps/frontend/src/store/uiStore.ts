import { create } from "zustand";

export type AppView = "play" | "shop" | "inventory" | "premium" | "profile" | "support" | "settings" | "admin";

interface UiState {
  view: AppView;
  setView: (view: AppView) => void;
}

export const useUiStore = create<UiState>((set) => ({
  view: "play",
  setView: (view) => set({ view })
}));
