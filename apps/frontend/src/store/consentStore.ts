import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ConsentState {
  decided: boolean;
  preferencesOpen: boolean;
  analytics: boolean;
  advertising: boolean;
  updatedAt: string | null;
  acceptAll: () => void;
  rejectOptional: () => void;
  save: (preferences: { analytics: boolean; advertising: boolean }) => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      decided: false,
      preferencesOpen: false,
      analytics: false,
      advertising: false,
      updatedAt: null,
      acceptAll: () => set({ decided: true, preferencesOpen: false, analytics: true, advertising: true, updatedAt: new Date().toISOString() }),
      rejectOptional: () => set({ decided: true, preferencesOpen: false, analytics: false, advertising: false, updatedAt: new Date().toISOString() }),
      save: (preferences) => set({ decided: true, preferencesOpen: false, ...preferences, updatedAt: new Date().toISOString() }),
      openPreferences: () => set({ preferencesOpen: true }),
      closePreferences: () => set((state) => ({ preferencesOpen: false, decided: state.decided }))
    }),
    {
      name: "waves_consent_v1",
      partialize: ({ decided, analytics, advertising, updatedAt }) => ({ decided, analytics, advertising, updatedAt })
    }
  )
);
