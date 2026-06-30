export type GameModeId = "classic" | "endless" | "time_attack" | "hardcore" | "zen" | "boss";

export interface GameModeDefinition {
  id: GameModeId;
  accent: string;
  glow: string;
  statusKey: string;
  timeLimitMs?: number;
}

export interface GameModeRuntimeProfile {
  difficulty: number;
  gapOffset: number;
  minimumGap: number;
  driftRange: number;
  eventChance: number;
  safeLaneChance: number;
  extraCoinChance: number;
  multiHazardChance: number;
  rotationMultiplier: number;
  verticalSpeedScale: number;
  suppressShake: boolean;
  statusKey: string;
  timeLimitMs?: number;
}

export const gameModeDefinitions: GameModeDefinition[] = [
  {
    id: "classic",
    accent: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.28)",
    statusKey: "gameModes.status.steadyRun"
  },
  {
    id: "endless",
    accent: "#22c55e",
    glow: "rgba(34, 197, 94, 0.28)",
    statusKey: "gameModes.status.adaptiveArena"
  },
  {
    id: "time_attack",
    accent: "#f97316",
    glow: "rgba(249, 115, 22, 0.26)",
    statusKey: "gameModes.status.scoreRush",
    timeLimitMs: 60_000
  },
  {
    id: "hardcore",
    accent: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.26)",
    statusKey: "gameModes.status.oneMistake"
  },
  {
    id: "zen",
    accent: "#a78bfa",
    glow: "rgba(167, 139, 250, 0.24)",
    statusKey: "gameModes.status.calmFlow"
  },
  {
    id: "boss",
    accent: "#facc15",
    glow: "rgba(250, 204, 21, 0.24)",
    statusKey: "gameModes.status.waveBuild"
  }
];

export function getGameModeDefinition(modeId: GameModeId) {
  return gameModeDefinitions.find((mode) => mode.id === modeId) ?? gameModeDefinitions[0]!;
}

export function resolveGameModeProfile(modeId: GameModeId, elapsedMs: number, distance: number): GameModeRuntimeProfile {
  const distanceDifficulty = Math.floor(distance / 5000);

  switch (modeId) {
    case "classic":
      return {
        difficulty: Math.min(18, 2 + distanceDifficulty),
        gapOffset: 0,
        minimumGap: 170,
        driftRange: 82,
        eventChance: 0.9,
        safeLaneChance: 0.08,
        extraCoinChance: 0.12,
        multiHazardChance: 0.14,
        rotationMultiplier: 1,
        verticalSpeedScale: 1,
        suppressShake: false,
        statusKey: "gameModes.status.steadyRun"
      };
    case "endless":
      return {
        difficulty: Math.min(16, 1 + Math.floor(distance / 6500)),
        gapOffset: 18,
        minimumGap: 182,
        driftRange: 74,
        eventChance: 0.78,
        safeLaneChance: 0.16,
        extraCoinChance: 0.22,
        multiHazardChance: 0.08,
        rotationMultiplier: 0.92,
        verticalSpeedScale: 0.98,
        suppressShake: false,
        statusKey: "gameModes.status.adaptiveArena"
      };
    case "time_attack": {
      const timeLeftMs = Math.max(0, 60_000 - elapsedMs);
      const closingRush = timeLeftMs < 20_000;
      return {
        difficulty: Math.min(17, 3 + distanceDifficulty + (closingRush ? 1 : 0)),
        gapOffset: closingRush ? -8 : 6,
        minimumGap: 164,
        driftRange: 88,
        eventChance: closingRush ? 0.96 : 0.88,
        safeLaneChance: closingRush ? 0.04 : 0.08,
        extraCoinChance: closingRush ? 0.2 : 0.28,
        multiHazardChance: closingRush ? 0.2 : 0.12,
        rotationMultiplier: closingRush ? 1.08 : 1,
        verticalSpeedScale: 1,
        suppressShake: false,
        statusKey: closingRush ? "gameModes.status.finalSprint" : "gameModes.status.scoreRush",
        timeLimitMs: 60_000
      };
    }
    case "hardcore":
      return {
        difficulty: Math.min(20, 5 + Math.floor(distance / 4200)),
        gapOffset: -34,
        minimumGap: 148,
        driftRange: 96,
        eventChance: 0.98,
        safeLaneChance: 0.02,
        extraCoinChance: 0.04,
        multiHazardChance: 0.28,
        rotationMultiplier: 1.12,
        verticalSpeedScale: 1.04,
        suppressShake: false,
        statusKey: "gameModes.status.oneMistake"
      };
    case "zen":
      return {
        difficulty: Math.min(10, 1 + Math.floor(distance / 9200)),
        gapOffset: 78,
        minimumGap: 220,
        driftRange: 54,
        eventChance: 0.46,
        safeLaneChance: 0.34,
        extraCoinChance: 0.36,
        multiHazardChance: 0.03,
        rotationMultiplier: 0.72,
        verticalSpeedScale: 0.88,
        suppressShake: true,
        statusKey: "gameModes.status.calmFlow"
      };
    case "boss": {
      const waveIndex = Math.floor(elapsedMs / 12_000);
      const surge = waveIndex % 2 === 1;
      return {
        difficulty: Math.min(19, (surge ? 6 : 3) + distanceDifficulty),
        gapOffset: surge ? -22 : 34,
        minimumGap: surge ? 156 : 196,
        driftRange: surge ? 90 : 68,
        eventChance: surge ? 0.98 : 0.62,
        safeLaneChance: surge ? 0.01 : 0.24,
        extraCoinChance: surge ? 0.06 : 0.28,
        multiHazardChance: surge ? 0.4 : 0.08,
        rotationMultiplier: surge ? 1.16 : 0.88,
        verticalSpeedScale: 1,
        suppressShake: false,
        statusKey: surge ? "gameModes.status.bossWave" : "gameModes.status.waveRecover"
      };
    }
    default:
      return {
        difficulty: Math.min(18, 2 + distanceDifficulty),
        gapOffset: 0,
        minimumGap: 170,
        driftRange: 82,
        eventChance: 0.9,
        safeLaneChance: 0.08,
        extraCoinChance: 0.12,
        multiHazardChance: 0.14,
        rotationMultiplier: 1,
        verticalSpeedScale: 1,
        suppressShake: false,
        statusKey: "gameModes.status.steadyRun"
      };
  }
}
