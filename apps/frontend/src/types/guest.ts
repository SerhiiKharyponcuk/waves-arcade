export type GuestAdEvent = "game_over" | "round_threshold" | "restart" | "save_score" | "open_shop" | "open_skins" | "claim_reward";

export interface GuestControls {
  movementType: "click" | "keyboard" | "touch";
  sensitivity: number;
  joystickEnabled: boolean;
}

export interface GuestTemporarySettings {
  locale: "en" | "nl" | "ru" | "uk";
  masterVolume: number;
  muted: boolean;
  vibration: boolean;
  reduceMotion: boolean;
  showTutorial: boolean;
}

export interface GuestSession {
  version: 1;
  guestId: string;
  gamesPlayed: number;
  bestGuestScore: number;
  currentSessionScore: number;
  adsShownCount: number;
  lastAdShownAt: string | null;
  selectedBasicTheme: string;
  selectedBasicSkin: string;
  selectedBasicControls: GuestControls;
  temporarySettings: GuestTemporarySettings;
  createdAt: string;
  updatedAt: string;
}
