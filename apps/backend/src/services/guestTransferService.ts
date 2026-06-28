import { createHash } from "node:crypto";
import type { GuestTransferPayloadDto, GuestTransferResultDto } from "@waves/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { getCurrentAccount } from "./authService.js";

const basicThemes = new Set(["classic-neon", "dark-space", "cyber-grid"]);
const allowedSettingKeys = new Set(["locale", "masterVolume", "muted", "vibration", "reduceMotion", "showTutorial"]);
const allowedControlKeys = new Set(["movementType", "sensitivity", "joystickEnabled"]);
type KnownPrismaError = { code?: string };

function guestIdHash(guestId: string) {
  return createHash("sha256").update(`${guestId}:waves-guest-transfer-v1`).digest("hex");
}

function pickSafeValues(source: Record<string, unknown>, allowedKeys: Set<string>) {
  return Object.fromEntries(
    Object.entries(source).filter(([key, value]) => allowedKeys.has(key) && ["string", "number", "boolean"].includes(typeof value))
  );
}

function isKnownPrismaError(error: unknown, code: string): error is KnownPrismaError {
  return Boolean(error && typeof error === "object" && "code" in error && (error as KnownPrismaError).code === code);
}

function rethrowSafeGuestTransferError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }
  if (isKnownPrismaError(error, "P2002")) {
    throw new AppError(409, "This guest progress was already transferred.", "GUEST_ALREADY_TRANSFERRED");
  }
  if (isKnownPrismaError(error, "P1008") || isKnownPrismaError(error, "P2028") || isKnownPrismaError(error, "P2034")) {
    throw new AppError(409, "Guest transfer is already being processed.", "GUEST_TRANSFER_CONFLICT");
  }
  throw error;
}

export async function transferGuestProgress(userId: string, input: GuestTransferPayloadDto): Promise<GuestTransferResultDto> {
  const hash = guestIdHash(input.guestId);
  const maxScoreForReportedGames = Math.min(500_000, Math.max(5_000, input.gamesPlayed * 25_000));
  const scoreIsPlausible = input.gamesPlayed > 0 && input.bestGuestScore <= maxScoreForReportedGames;
  const selectedThemeId = basicThemes.has(input.selectedBasicTheme) ? input.selectedBasicTheme : "classic-neon";
  const safeSettings = pickSafeValues(input.temporarySettings, allowedSettingKeys);
  const safeControls = pickSafeValues(input.selectedBasicControls, allowedControlKeys);
  const status = scoreIsPlausible ? "accepted" : "partial";
  const reason = scoreIsPlausible ? undefined : "guest_score_failed_basic_plausibility_check";

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const profile = await tx.userProfile.findUnique({ where: { userId } });
      if (!profile) {
        throw new AppError(404, "Profile not found.", "PROFILE_NOT_FOUND");
      }

      await tx.guestTransferAttempt.create({
        data: {
          userId,
          guestIdHash: hash,
          status,
          bestScore: input.bestGuestScore,
          transferredScore: scoreIsPlausible ? input.bestGuestScore : 0,
          reason,
          metadata: JSON.stringify({ gamesPlayed: input.gamesPlayed, selectedThemeId, temporaryCoinsIgnored: true })
        }
      });
      await tx.userProfile.update({
        where: { userId },
        data: {
          highScore: scoreIsPlausible ? Math.max(profile.highScore, input.bestGuestScore) : profile.highScore,
          selectedThemeId,
          gameSettingsJson: JSON.stringify({ ...safeSettings, controls: safeControls })
        }
      });
      await tx.ownedTheme.upsert({
        where: { userId_themeId: { userId, themeId: selectedThemeId } },
        create: { userId, themeId: selectedThemeId, source: "guest_transfer" },
        update: {}
      });
    });
  } catch (error) {
    rethrowSafeGuestTransferError(error);
  }

  return {
    status,
    transferredScore: scoreIsPlausible ? input.bestGuestScore : 0,
    selectedThemeId,
    reason,
    user: await getCurrentAccount(userId)
  };
}
