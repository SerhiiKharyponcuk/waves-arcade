import type { GuestSession } from "../types/guest";

const STORAGE_KEY = "waves_guest_session_v1";

function createGuestId() {
  return globalThis.crypto?.randomUUID?.() ?? `guest-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createGuestSession(): GuestSession {
  const now = new Date().toISOString();
  return {
    version: 1,
    guestId: createGuestId(),
    gamesPlayed: 0,
    bestGuestScore: 0,
    currentSessionScore: 0,
    adsShownCount: 0,
    lastAdShownAt: null,
    selectedBasicTheme: "classic-neon",
    selectedBasicSkin: "cyber-green",
    selectedBasicControls: {
      movementType: "click",
      sensitivity: 1,
      joystickEnabled: true
    },
    temporarySettings: {
      locale: "en",
      masterVolume: 0.8,
      muted: false,
      vibration: true,
      reduceMotion: false,
      showTutorial: true
    },
    createdAt: now,
    updatedAt: now
  };
}

function sanitizeStoredSession(value: unknown): GuestSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<GuestSession>;
  if (candidate.version !== 1 || typeof candidate.guestId !== "string") {
    return null;
  }

  const fresh = createGuestSession();
  return {
    ...fresh,
    ...candidate,
    gamesPlayed: Math.max(0, Math.min(Number(candidate.gamesPlayed) || 0, 100_000)),
    bestGuestScore: Math.max(0, Math.min(Number(candidate.bestGuestScore) || 0, 5_000_000)),
    currentSessionScore: Math.max(0, Math.min(Number(candidate.currentSessionScore) || 0, 5_000_000)),
    adsShownCount: Math.max(0, Math.min(Number(candidate.adsShownCount) || 0, 100_000)),
    selectedBasicTheme: typeof candidate.selectedBasicTheme === "string" ? candidate.selectedBasicTheme : fresh.selectedBasicTheme,
    selectedBasicSkin: typeof candidate.selectedBasicSkin === "string" ? candidate.selectedBasicSkin : fresh.selectedBasicSkin,
    selectedBasicControls: { ...fresh.selectedBasicControls, ...candidate.selectedBasicControls },
    temporarySettings: { ...fresh.temporarySettings, ...candidate.temporarySettings }
  };
}

export function loadGuestSession(): GuestSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeStoredSession(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveGuestSession(session: GuestSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, updatedAt: new Date().toISOString() }));
}

export function clearGuestSession() {
  localStorage.removeItem(STORAGE_KEY);
}
