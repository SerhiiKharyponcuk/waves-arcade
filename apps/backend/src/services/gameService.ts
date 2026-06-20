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
import { validateScoreSubmission } from "./antiCheatService.js";

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

  const validation = await validateScoreSubmission({ userId, sessionStartedAt: session.startedAt, payload: input });
  const accepted = validation.status === "valid";
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
        status: "ended",
        antiCheatNotes: validation.reasons.join(",")
      }
    });

    const newHighScore = accepted && acceptedScore > profile.highScore;

    await tx.score.create({
      data: {
        userId,
        sessionId: input.sessionId,
        score: accepted ? acceptedScore : input.score,
        distance: input.distance,
        durationMs: input.durationMs,
        status: validation.status,
        reviewReason: validation.reasons.join(",") || null
      }
    });

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
    await flagSuspiciousRun(userId, validation.reasons.join(","));
  }

  return {
    accepted,
    status: validation.status,
    reviewReason: validation.status === "pending_review" ? validation.reasons.join(", ") : undefined,
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
    where: {
      status: "valid",
      user: {
        status: "ACTIVE",
        profile: { showUsernameInLeaderboard: true },
        restrictions: { none: { active: true, type: { in: ["leaderboard_restriction", "temporary_ban", "permanent_ban"] } } }
      }
    },
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
