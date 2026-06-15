import type { SupportedLocale, UserProfileDto } from "@waves/shared";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";

export async function getUserProfile(userId: string): Promise<UserProfileDto> {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(404, "Profile not found.", "PROFILE_NOT_FOUND");
  }

  return {
    id: profile.id,
    displayName: profile.displayName,
    locale: profile.locale as SupportedLocale,
    avatarUrl: profile.avatarUrl,
    highScore: profile.highScore,
    selectedArrowSkinId: profile.selectedArrowSkinId,
    selectedTrailSkinId: profile.selectedTrailSkinId,
    createdAt: profile.createdAt.toISOString()
  };
}

export async function updateUserProfile(
  userId: string,
  input: { displayName?: string; locale?: SupportedLocale; avatarUrl?: string | null }
): Promise<UserProfileDto> {
  const profile = await prisma.userProfile.update({
    where: { userId },
    data: input
  });

  return {
    id: profile.id,
    displayName: profile.displayName,
    locale: profile.locale as SupportedLocale,
    avatarUrl: profile.avatarUrl,
    highScore: profile.highScore,
    selectedArrowSkinId: profile.selectedArrowSkinId,
    selectedTrailSkinId: profile.selectedTrailSkinId,
    createdAt: profile.createdAt.toISOString()
  };
}
