import { create } from "zustand";
import { clearGuestSession, createGuestSession, loadGuestSession, saveGuestSession } from "../services/guestSession";
import type { GuestSession } from "../types/guest";

interface GuestState {
  active: boolean;
  session: GuestSession | null;
  requestedAuthMode: "login" | "register" | null;
  continueAsGuest: () => void;
  leaveGuestMode: () => void;
  requestAuthentication: (mode: "login" | "register") => void;
  clearAuthenticationRequest: () => void;
  clearProgress: () => void;
  updateSession: (updater: (session: GuestSession) => GuestSession) => void;
  recordGame: (score: number) => void;
}

export const useGuestStore = create<GuestState>((set, get) => ({
  active: false,
  session: loadGuestSession(),
  requestedAuthMode: null,
  continueAsGuest: () => {
    const session = get().session ?? createGuestSession();
    saveGuestSession(session);
    set({ active: true, session });
  },
  leaveGuestMode: () => set({ active: false }),
  requestAuthentication: (mode) => set({ active: false, requestedAuthMode: mode }),
  clearAuthenticationRequest: () => set({ requestedAuthMode: null }),
  clearProgress: () => {
    clearGuestSession();
    set({ active: false, session: null });
  },
  updateSession: (updater) => {
    const current = get().session ?? createGuestSession();
    const session = updater(current);
    saveGuestSession(session);
    set({ session });
  },
  recordGame: (score) => {
    get().updateSession((session) => ({
      ...session,
      gamesPlayed: session.gamesPlayed + 1,
      currentSessionScore: Math.max(0, score),
      bestGuestScore: Math.max(session.bestGuestScore, score)
    }));
  }
}));
