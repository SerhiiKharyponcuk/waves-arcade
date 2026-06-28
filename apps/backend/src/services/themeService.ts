import { gameThemes, type GameThemeDto } from "@waves/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { assertNoActiveRestriction } from "./restrictionService.js";

export type ShopThemeDto = GameThemeDto & { owned: boolean; equipped: boolean; canUnlockByScore: boolean };

type KnownPrismaError = {
  code?: string;
};

function isKnownPrismaError(error: unknown, code: string): error is KnownPrismaError {
  return Boolean(error && typeof error === "object" && "code" in error && (error as KnownPrismaError).code === code);
}

function rethrowSafeThemeUnlockError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }
  if (isKnownPrismaError(error, "P2002")) {
    throw new AppError(409, "Theme already owned.", "THEME_ALREADY_OWNED");
  }
  if (isKnownPrismaError(error, "P1008") || isKnownPrismaError(error, "P2028") || isKnownPrismaError(error, "P2034")) {
    throw new AppError(409, "Theme unlock is already being processed. Please refresh and try again.", "PURCHASE_CONFLICT");
  }
  throw error;
}

export async function listThemes(userId?: string): Promise<ShopThemeDto[]> {
  const [profile, owned] = userId
    ? await Promise.all([
        prisma.userProfile.findUnique({ where: { userId } }),
        prisma.ownedTheme.findMany({ where: { userId } })
      ])
    : [null, []];
  const ownedIds = new Set(owned.map((item) => item.themeId));

  return gameThemes.map((theme) => ({
    ...theme,
    owned: theme.type === "free" || ownedIds.has(theme.id),
    equipped: profile?.selectedThemeId === theme.id,
    canUnlockByScore: Boolean(profile && theme.type === "unlockable" && profile.highScore >= theme.priceCoins * 10)
  }));
}

export async function unlockTheme(userId: string, themeId: string) {
  await assertNoActiveRestriction(userId, ["shop_restriction", "temporary_ban", "permanent_ban"], "Theme shop");
  const theme = gameThemes.find((item) => item.id === themeId);
  if (!theme) throw new AppError(404, "Theme not found.", "THEME_NOT_FOUND");

  if (theme.type === "free") {
    await prisma.ownedTheme.upsert({
      where: { userId_themeId: { userId, themeId } },
      create: { userId, themeId, source: "free" },
      update: {}
    });
    return listThemes(userId);
  }

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const [profile, wallet, subscription, existing] = await Promise.all([
        tx.userProfile.findUnique({ where: { userId } }),
        tx.wallet.findUnique({ where: { userId }, select: { id: true } }),
        tx.subscription.findUnique({ where: { userId } }),
        tx.ownedTheme.findUnique({ where: { userId_themeId: { userId, themeId } } })
      ]);
      if (!profile || !wallet) throw new AppError(404, "Account data is incomplete.", "ACCOUNT_INCOMPLETE");
      if (existing) return;

      if (theme.type === "premium") {
        const premium = subscription?.status === "premium_active" || subscription?.status === "trial_active";
        if (!premium) throw new AppError(403, "This theme requires Premium.", "PREMIUM_REQUIRED");
      }

      const scoreUnlock = theme.type === "unlockable" && profile.highScore >= theme.priceCoins * 10;
      await tx.ownedTheme.create({ data: { userId, themeId, source: scoreUnlock ? "score" : theme.type } });

      if (theme.type === "unlockable" && !scoreUnlock && theme.priceCoins > 0) {
        const debit = await tx.wallet.updateMany({
          where: { userId, coins: { gte: theme.priceCoins } },
          data: { coins: { decrement: theme.priceCoins } }
        });
        if (debit.count !== 1) {
          throw new AppError(402, "Reach the required score or earn more coins.", "THEME_LOCKED");
        }

        await tx.walletTransaction.create({
          data: {
            userId,
            walletId: wallet.id,
            type: "SHOP_PURCHASE",
            provider: "wallet",
            amountCoins: -theme.priceCoins,
            metadata: JSON.stringify({ themeId })
          }
        });
      }
    });
  } catch (error) {
    rethrowSafeThemeUnlockError(error);
  }

  return listThemes(userId);
}

export async function equipTheme(userId: string, themeId: string) {
  await assertNoActiveRestriction(userId, ["shop_restriction", "temporary_ban", "permanent_ban"], "Theme equipment");
  const theme = gameThemes.find((item) => item.id === themeId);
  if (!theme) throw new AppError(404, "Theme not found.", "THEME_NOT_FOUND");
  const owned = theme.type === "free" || Boolean(await prisma.ownedTheme.findUnique({ where: { userId_themeId: { userId, themeId } } }));
  if (!owned) throw new AppError(403, "Unlock this theme before equipping it.", "THEME_NOT_OWNED");
  await prisma.userProfile.update({ where: { userId }, data: { selectedThemeId: themeId } });
  return listThemes(userId);
}
