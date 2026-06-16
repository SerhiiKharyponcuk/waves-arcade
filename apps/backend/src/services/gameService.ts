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
import { AppError } from "../utils/appError.js";

type LeaderboardScoreRow = {
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

function validateSessionResult(input: GameSessionEndRequestDto) {
  const notes: string[] = [];

  if (input.durationMs < 350) {
    notes.push("duration_too_short");
  }
  if (input.durationMs > 900_000) {
    notes.push("duration_too_long");
  }
  if (input.score < 0 || input.coinsCollected < 0 || input.distance < 0) {
    notes.push("negative_values");
  }
  if (input.coinsCollected > 500) {
    notes.push("coin_cap_exceeded");
  }

  const maxReasonableScore = Math.floor(input.distance * 4 + input.coinsCollected * 75 + 2_000);
  if (input.score > maxReasonableScore) {
    notes.push("score_distance_ratio");
  }

  return {
    valid: notes.length === 0,
    notes
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

  const validation = validateSessionResult(input);
  const expectedChecksum = scoreChecksum(userId, input.sessionId, input.score, input.distance, input.durationMs);
  const checksumMatches = !input.clientChecksum || input.clientChecksum === expectedChecksum;
  const accepted = validation.valid && checksumMatches;
  const safeCoins = accepted ? Math.min(input.coinsCollected + Math.floor(input.score / 250), 250) : 0;

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const profile = await tx.userProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new AppError(404, "Profile not found.", "PROFILE_NOT_FOUND");
    }

    await tx.gameSession.update({
      where: { id: input.sessionId },
      data: {
        endedAt: new Date(),
        score: input.score,
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

    const newHighScore = accepted && input.score > profile.highScore;

    if (accepted) {
      await tx.score.create({
        data: {
          userId,
          sessionId: input.sessionId,
          score: input.score,
          distance: input.distance,
          durationMs: input.durationMs
        }
      });
    }

    if (newHighScore) {
      await tx.userProfile.update({
        where: { userId },
        data: { highScore: input.score }
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

  return {
    accepted,
    score: accepted ? input.score : 0,
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
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    include: { user: { include: { profile: true } } }
  });

  return scores.map((score: LeaderboardScoreRow, index: number) => ({
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
