export interface GameSettings {
  difficulty: "normal" | "hard" | "adaptive";
  controlSensitivity: number;
  movementType: "click" | "keyboard" | "touch";
  vibration: boolean;
  autoPause: boolean;
  showTutorial: boolean;
  showScoreDuringGame: boolean;
  reduceMotion: boolean;
  keyboardControls: boolean;
  touchControls: boolean;
  mouseControls: boolean;
  joystickEnabled: boolean;
  controlSize: number;
  masterVolume: number;
  musicVolume: number;
  soundEffectsVolume: number;
  muteAll: boolean;
  particles: boolean;
  screenShake: boolean;
  trailEffects: boolean;
  animationQuality: "low" | "medium" | "high";
  lowPerformanceMode: boolean;
  highContrastMode: boolean;
  rewardedAdsPermission: boolean;
}

export const defaultGameSettings: GameSettings = {
  difficulty: "adaptive",
  controlSensitivity: 1,
  movementType: "click",
  vibration: true,
  autoPause: true,
  showTutorial: true,
  showScoreDuringGame: true,
  reduceMotion: false,
  keyboardControls: true,
  touchControls: true,
  mouseControls: true,
  joystickEnabled: true,
  controlSize: 1,
  masterVolume: 0.8,
  musicVolume: 0.65,
  soundEffectsVolume: 0.8,
  muteAll: false,
  particles: true,
  screenShake: true,
  trailEffects: true,
  animationQuality: "high",
  lowPerformanceMode: false,
  highContrastMode: false,
  rewardedAdsPermission: true
};
