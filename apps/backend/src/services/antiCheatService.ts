import type { GameSessionCheckpointRequestDto, GameSessionEndRequestDto, ScoreStatus } from "@waves/shared";
import { prisma } from "../config/prisma.js";

const HARD_REJECT_REASONS = new Set([
  "negative_values",
  "duration_too_long",
  "duration_exceeds_server_time",
  "distance_impossible",
  "coin_cap_impossible",
  "invalid_obstacle_hits",
  "score_formula_impossible",
  "checkpoint_distance_jump_impossible",
  "checkpoint_coin_jump_impossible",
  "checkpoint_previously_rejected"
]);

export interface ScoreValidationResult {
  status: ScoreStatus;
  expectedScore: number;
  reasons: string[];
}

export function calculateServerScore(input: GameSessionEndRequestDto) {
  return input.distance + input.coinsCollected * 125;
}

export interface CheckpointState {
  checkpointCount: number;
  lastCheckpointElapsedMs: number;
  checkpointDistance: number;
  checkpointCoins: number;
  checkpointTransitions: number;
}

export function validateCheckpointProgress(
  previous: CheckpointState,
  payload: GameSessionCheckpointRequestDto,
  serverElapsedMs: number
) {
  const reasons: string[] = [];
  const elapsedDelta = payload.elapsedMs - previous.lastCheckpointElapsedMs;
  const distanceDelta = payload.distance - previous.checkpointDistance;
  const coinDelta = payload.coinsCollected - previous.checkpointCoins;
  const transitionDelta = payload.inputTransitions - previous.checkpointTransitions;
  const maxDistanceDelta = Math.floor(Math.max(elapsedDelta, 0) / 1000 * 460 + 160);
  const maxCoinDelta = Math.ceil(Math.max(distanceDelta, 0) / 150) + 4;

  if (payload.sequence !== previous.checkpointCount + 1) reasons.push("checkpoint_sequence_invalid");
  if (payload.elapsedMs > serverElapsedMs + 2_500) reasons.push("checkpoint_ahead_of_server");
  if (elapsedDelta < 750 && previous.checkpointCount > 0) reasons.push("checkpoint_too_frequent");
  if (elapsedDelta > 20_000) reasons.push("checkpoint_gap_too_large");
  if (distanceDelta < 0 || coinDelta < 0 || transitionDelta < 0) reasons.push("checkpoint_not_monotonic");
  if (distanceDelta > maxDistanceDelta) reasons.push("checkpoint_distance_jump_impossible");
  if (coinDelta > maxCoinDelta) reasons.push("checkpoint_coin_jump_impossible");
  if (transitionDelta > Math.ceil(Math.max(elapsedDelta, 1) / 80) + 4) reasons.push("checkpoint_input_rate_impossible");

  return reasons;
}

export async function validateScoreSubmission(input: {
  userId: string;
  session: {
    startedAt: Date;
    checkpointCount: number;
    lastCheckpointAt: Date | null;
    lastCheckpointElapsedMs: number;
    checkpointDistance: number;
    checkpointCoins: number;
    antiCheatNotes: string | null;
  };
  payload: GameSessionEndRequestDto;
}): Promise<ScoreValidationResult> {
  const { payload, session, userId } = input;
  const sessionStartedAt = session.startedAt;
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

  if (session.antiCheatNotes) reasons.push("checkpoint_previously_rejected");
  if (payload.durationMs >= 3_000 && session.checkpointCount < 1) reasons.push("checkpoint_proof_missing");
  if (payload.durationMs >= 12_000 && session.checkpointCount < 2) reasons.push("checkpoint_proof_missing");
  if (session.lastCheckpointAt) {
    const unobservedMs = Math.max(0, payload.durationMs - session.lastCheckpointElapsedMs);
    const unobservedDistance = payload.distance - session.checkpointDistance;
    const unobservedCoins = payload.coinsCollected - session.checkpointCoins;
    const maxUnobservedDistance = Math.floor(unobservedMs / 1000 * 460 + 180);
    const maxUnobservedCoins = Math.ceil(Math.max(unobservedDistance, 0) / 150) + 4;
    if (unobservedMs > 15_000) reasons.push("checkpoint_proof_stale");
    if (unobservedDistance < 0 || unobservedCoins < 0) reasons.push("checkpoint_final_not_monotonic");
    if (unobservedDistance > maxUnobservedDistance) reasons.push("checkpoint_distance_jump_impossible");
    if (unobservedCoins > maxUnobservedCoins) reasons.push("checkpoint_coin_jump_impossible");
  }

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
