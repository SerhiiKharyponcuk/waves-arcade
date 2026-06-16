import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import type {
  GameSessionEndRequestDto,
  GameSessionEndResponseDto,
  GameSessionStartResponseDto,
  LeaderboardEntryDto
} from "@waves/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { flagSuspiciousRun } from "./adminService.js";
import { AppError } from "../utils/appError.js";

type LeaderboardScoreRow = {
  id: string;
  userId: string;
  score: number;
  createdAt: Date;
  user: {
    profile: {
      displayName: string;
    } | null;
  };
};

function scoreChecksum(userId: string, sessionId: string, score: number, distance: number, durationMs: number) {
  return createHash("sha256")
    .update(`${userId}:${sessionId}:${score}:${distance}:${durationMs}:waves-v1`)
    .digest("hex")
    .slice(0, 16);
}

function calculateServerScore(input: GameSessionEndRequestDto) {
  return input.distance + input.coinsCollected * 125;
}

function validateSessionResult(input: GameSessionEndRequestDto, sessionStartedAt: Date) {
  const notes: string[] = [];
  const expectedScore = calculateServerScore(input);
  const scoreDelta = Math.abs(input.score - expectedScore);

  if (input.durationMs < 350) {
    notes.push("duration_too_short");
  }
  if (input.durationMs > 900_000) {
    notes.push("duration_too_long");
  }
  if (input.score < 0 || input.coinsCollected < 0 || input.distance < 0) {
    notes.push("negative_values");
  }

  if (scoreDelta > 3) {
    notes.push("score_formula_mismatch");
  }

  const durationSeconds = Math.max(input.durationMs / 1000, 0.35);
  const maxDistance = Math.floor(durationSeconds * 385 + 120);
  if (input.distance > maxDistance) {
    notes.push("distance_speed_cap");
  }

  const serverElapsedMs = Date.now() - sessionStartedAt.getTime();
  if (input.durationMs > serverElapsedMs + 2_500) {
    notes.push("duration_exceeds_server_time");
  }

  const maxReasonableCoins = Math.ceil(input.distance / 220) + 8;
  if (input.coinsCollected > maxReasonableCoins) {
    notes.push("coin_cap_exceeded");
  }

  if (input.obstacleHits > 1) {
    notes.push("invalid_obstacle_hits");
  }

  return {
    valid: notes.length === 0,
    notes,
    expectedScore
  };
}

export async function startGameSession(userId: string): Promise<GameSessionStartResponseDto> {
  const seed = nanoid(18);
  const session = await prisma.gameSession.create({
    data: {
      userId,
      seed
    }
  });

  return {
    sessionId: session.id,
    seed,
    serverStartedAt: session.startedAt.toISOString()
  };
}

export async function endGameSession(
  userId: string,
  input: GameSessionEndRequestDto
): Promise<GameSessionEndResponseDto> {
  const session = await prisma.gameSession.findFirst({
    where: { id: input.sessionId, userId }
  });

  if (!session) {
    throw new AppError(404, "Game session not found.", "SESSION_NOT_FOUND");
  }
  if (session.endedAt) {
    throw new AppError(409, "Game session already ended.", "SESSION_ALREADY_ENDED");
  }

  const validation = validateSessionResult(input, session.startedAt);
  const expectedChecksum = scoreChecksum(userId, input.sessionId, input.score, input.distance, input.durationMs);
  const checksumMatches = !input.clientChecksum || input.clientChecksum === expectedChecksum;
  const accepted = validation.valid && checksumMatches;
  const acceptedScore = accepted ? validation.expectedScore : 0;
  const safeCoins = accepted ? Math.min(input.coinsCollected + Math.floor(acceptedScore / 250), 250) : 0;

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const profile = await tx.userProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new AppError(404, "Profile not found.", "PROFILE_NOT_FOUND");
    }

    await tx.gameSession.update({
      where: { id: input.sessionId },
      data: {
        endedAt: new Date(),
        score: acceptedScore,
        coinsCollected: input.coinsCollected,
        distance: input.distance,
        durationMs: input.durationMs,
        obstacleHits: input.obstacleHits,
        checksum: input.clientChecksum,
        valid: accepted,
        antiCheatNotes: [...validation.notes, checksumMatches ? "" : "checksum_mismatch"]
          .filter(Boolean)
          .join(",")
      }
    });

    const newHighScore = accepted && acceptedScore > profile.highScore;

    if (accepted) {
      await tx.score.create({
        data: {
          userId,
          sessionId: input.sessionId,
          score: acceptedScore,
          distance: input.distance,
          durationMs: input.durationMs
        }
      });
    }

    if (newHighScore) {
      await tx.userProfile.update({
        where: { userId },
        data: { highScore: acceptedScore }
      });
    }

    const wallet = safeCoins
      ? await tx.wallet.update({
          where: { userId },
          data: {
            coins: { increment: safeCoins },
            lifetimeCoins: { increment: safeCoins }
          }
        })
      : await tx.wallet.findUniqueOrThrow({ where: { userId } });

    return { wallet, newHighScore };
  });

  if (!accepted) {
    await flagSuspiciousRun(userId, [...validation.notes, checksumMatches ? "" : "checksum_mismatch"].filter(Boolean).join(","));
  }

  return {
    accepted,
    score: acceptedScore,
    coinsAwarded: safeCoins,
    newHighScore: result.newHighScore,
    wallet: {
      coins: result.wallet.coins,
      gems: result.wallet.gems,
      rouletteTickets: result.wallet.rouletteTickets,
      extraLives: result.wallet.extraLives,
      lifetimeCoins: result.wallet.lifetimeCoins
    }
  };
}

export async function getLeaderboard(limit = 10): Promise<LeaderboardEntryDto[]> {
  const scores = await prisma.score.findMany({
    take: limit,
    where: { user: { status: "ACTIVE" } },
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    include: { user: { include: { profile: true } } }
  });

  return scores.map((score: LeaderboardScoreRow, index: number) => ({
    scoreId: score.id,
    userId: score.userId,
    displayName: score.user.profile?.displayName ?? "Player",
    score: score.score,
    rank: index + 1,
    achievedAt: score.createdAt.toISOString()
  }));
}

export async function getMyBestScore(userId: string) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(404, "Profile not found.", "PROFILE_NOT_FOUND");
  }

  return { highScore: profile.highScore };
}

export function createClientChecksum(userId: string, sessionId: string, score: number, distance: number, durationMs: number) {
  return scoreChecksum(userId, sessionId, score, distance, durationMs);
}
