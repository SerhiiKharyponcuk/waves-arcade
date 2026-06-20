import type { SupportedLocale, UserProfileDto } from "@waves/shared";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";

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
