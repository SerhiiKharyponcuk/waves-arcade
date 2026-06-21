import type { SupportedLocale, UserProfileDto } from "@waves/shared";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

function parseRecord(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function toProfileDto(profile: Awaited<ReturnType<typeof prisma.userProfile.findUniqueOrThrow>>): UserProfileDto {
  return {
    id: profile.id,
    displayName: profile.displayName,
    locale: profile.locale as SupportedLocale,
    avatarUrl: profile.avatarUrl,
    highScore: profile.highScore,
    selectedArrowSkinId: profile.selectedArrowSkinId,
    selectedTrailSkinId: profile.selectedTrailSkinId,
    selectedThemeId: profile.selectedThemeId,
    customization: parseRecord(profile.customizationJson) as Record<string, string>,
    gameSettings: parseRecord(profile.gameSettingsJson),
    showUsernameInLeaderboard: profile.showUsernameInLeaderboard,
    hideProfile: profile.hideProfile,
    createdAt: profile.createdAt.toISOString()
  };
}

export async function getUserProfile(userId: string): Promise<UserProfileDto> {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(404, "Profile not found.", "PROFILE_NOT_FOUND");
  }

  return toProfileDto(profile);
}

export async function updateUserProfile(
  userId: string,
  input: {
    displayName?: string;
    locale?: SupportedLocale;
    avatarUrl?: string | null;
    selectedThemeId?: string;
    customization?: Record<string, string>;
    gameSettings?: Record<string, unknown>;
    showUsernameInLeaderboard?: boolean;
    hideProfile?: boolean;
  }
): Promise<UserProfileDto> {
  const { customization, gameSettings, ...plainInput } = input;
  const profile = await prisma.userProfile.update({
    where: { userId },
    data: {
      ...plainInput,
      customizationJson: customization ? JSON.stringify(customization) : undefined,
      gameSettingsJson: gameSettings ? JSON.stringify(gameSettings) : undefined
    }
  });

  return toProfileDto(profile);
}

export async function deleteUserAccount(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true, wallet: true } });
  if (!user || user.status !== "ACTIVE") throw new AppError(404, "Account not found.", "ACCOUNT_NOT_FOUND");
  if (user.role === "ADMIN") throw new AppError(403, "Admin accounts must be transferred before deletion.", "ADMIN_DELETE_BLOCKED");
  if (!await bcrypt.compare(password, user.passwordHash)) throw new AppError(401, "Password is incorrect.", "PASSWORD_INCORRECT");

  const erasedPasswordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `deleted+${userId}@deleted.invalid`,
        passwordHash: erasedPasswordHash,
        status: "DELETED",
        banReason: null,
        emailVerifiedAt: null,
        mustChangePassword: false
      }
    });
    await tx.userProfile.update({ where: { userId }, data: { displayName: "Deleted Player", avatarUrl: null, highScore: 0, hideProfile: true, showUsernameInLeaderboard: false, customizationJson: "{}", gameSettingsJson: "{}" } });
    await tx.wallet.update({ where: { userId }, data: { coins: 0, gems: 0, rouletteTickets: 0, extraLives: 0 } });
    await tx.score.updateMany({ where: { userId }, data: { status: "hidden", reviewReason: "Account deleted by user" } });
    await tx.gameSession.updateMany({ where: { userId }, data: { valid: false, status: "deleted" } });
    await tx.supportTicket.updateMany({ where: { userId }, data: { contactEmail: null, contactName: "Deleted Player" } });
    await tx.refreshToken.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.emailVerificationCode.deleteMany({ where: { userId } });
    await tx.analyticsEvent.deleteMany({ where: { userId } });
  });
  return { success: true };
}
