import type {
  GameSessionEndRequestDto,
  GameSessionEndResponseDto,
  GameSessionCheckpointRequestDto,
  GameSessionCheckpointResponseDto,
  GameSessionStartResponseDto,
  LeaderboardResponse
} from "../types/api";
import { apiRequest } from "./apiClient";

export const gameApi = {
  startSession() {
    return apiRequest<GameSessionStartResponseDto>("/game/session/start", {
      method: "POST"
    });
  },
  checkpoint(payload: GameSessionCheckpointRequestDto) {
    return apiRequest<GameSessionCheckpointResponseDto>("/game/session/checkpoint", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  endSession(payload: GameSessionEndRequestDto) {
    return apiRequest<GameSessionEndResponseDto>("/game/session/end", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  leaderboard() {
    return apiRequest<LeaderboardResponse>("/game/leaderboard");
  }
};
