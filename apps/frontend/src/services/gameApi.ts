import type {
  GameSessionEndRequestDto,
  GameSessionEndResponseDto,
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
