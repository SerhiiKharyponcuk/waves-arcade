import type { GameSessionEndRequestDto, ScoreStatus } from "@waves/shared";
import { prisma } from "../config/prisma.js";

const HARD_REJECT_REASONS = new Set([
  "negative_values",
  "duration_too_long",
  "duration_exceeds_server_time",
  "distance_impossible",
  "coin_cap_impossible",
  "invalid_obstacle_hits",
  "score_formula_impossible"
]);

export interface ScoreValidationResult {
  status: ScoreStatus;
  expectedScore: number;
  reasons: string[];
}

export function calculateServerScore(input: GameSessionEndRequestDto) {
  return input.distance + input.coinsCollected * 125;
}

export async function validateScoreSubmission(input: {
  userId: string;
  sessionStartedAt: Date;
  payload: GameSessionEndRequestDto;
}): Promise<ScoreValidationResult> {
  const { payload, sessionStartedAt, userId } = input;
  const reasons: string[] = [];
  const expectedScore = calculateServerScore(payload);
  const durationSeconds = Math.max(payload.durationMs / 1000, 0.35);
  const serverElapsedMs = Date.now() - sessionStartedAt.getTime();
  const maxDistance = Math.floor(durationSeconds * 385 + 120);
  const hardDistanceLimit = Math.floor(durationSeconds * 650 + 250);
  const maxReasonableCoins = Math.ceil(payload.distance / 220) + 8;

  if (sessionStartedAt.getTime() > Date.now()) reasons.push("session_started_in_future");
  if (payload.durationMs < 350) reasons.push("duration_too_short");
  if (payload.durationMs > 900_000) reasons.push("duration_too_long");
  if (payload.score < 0 || payload.coinsCollected < 0 || payload.distance < 0) reasons.push("negative_values");
  if (Math.abs(payload.score - expectedScore) > 3) reasons.push("score_formula_mismatch");
  if (Math.abs(payload.score - expectedScore) > 2_000) reasons.push("score_formula_impossible");
  if (payload.distance > maxDistance) reasons.push("distance_speed_cap");
  if (payload.distance > hardDistanceLimit) reasons.push("distance_impossible");
  if (payload.durationMs > serverElapsedMs + 2_500) reasons.push("duration_exceeds_server_time");
  if (payload.coinsCollected > maxReasonableCoins) reasons.push("coin_cap_exceeded");
  if (payload.coinsCollected > maxReasonableCoins * 3 + 10) reasons.push("coin_cap_impossible");
  if (payload.obstacleHits > 1) reasons.push("invalid_obstacle_hits");

  const recentSubmits = await prisma.gameSession.count({
    where: {
      userId,
      endedAt: { gte: new Date(Date.now() - 60_000) }
    }
  });
  if (recentSubmits >= 8) reasons.push("score_submit_rate_exceeded");

  const recentRejected = await prisma.score.count({
    where: {
      userId,
      status: { in: ["rejected", "suspicious", "pending_review"] },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) }
    }
  });
  if (recentRejected >= 3) reasons.push("repeated_impossible_scores");

  if (!reasons.length) {
    return { status: "valid", expectedScore, reasons };
  }
  if (reasons.some((reason) => HARD_REJECT_REASONS.has(reason))) {
    return { status: "rejected", expectedScore, reasons };
  }
  return { status: "pending_review", expectedScore, reasons };
}
