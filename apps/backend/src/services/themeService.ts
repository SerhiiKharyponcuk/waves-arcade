import { gameThemes, type GameThemeDto } from "@waves/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { assertNoActiveRestriction } from "./restrictionService.js";

export type ShopThemeDto = GameThemeDto & { owned: boolean; equipped: boolean; canUnlockByScore: boolean };

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
  const [profile, wallet, subscription, existing] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.subscription.findUnique({ where: { userId } }),
    prisma.ownedTheme.findUnique({ where: { userId_themeId: { userId, themeId } } })
  ]);
  if (!profile || !wallet) throw new AppError(404, "Account data is incomplete.", "ACCOUNT_INCOMPLETE");
  if (existing || theme.type === "free") {
    await prisma.ownedTheme.upsert({ where: { userId_themeId: { userId, themeId } }, create: { userId, themeId, source: "free" }, update: {} });
    return listThemes(userId);
  }
  if (theme.type === "premium") {
    const premium = subscription?.status === "premium_active" || subscription?.status === "trial_active";
    if (!premium) throw new AppError(403, "This theme requires Premium.", "PREMIUM_REQUIRED");
  }
  const scoreUnlock = theme.type === "unlockable" && profile.highScore >= theme.priceCoins * 10;
  if (theme.type === "unlockable" && !scoreUnlock && wallet.coins < theme.priceCoins) {
    throw new AppError(402, "Reach the required score or earn more coins.", "THEME_LOCKED");
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (theme.type === "unlockable" && !scoreUnlock && theme.priceCoins > 0) {
      await tx.wallet.update({ where: { userId }, data: { coins: { decrement: theme.priceCoins } } });
      await tx.walletTransaction.create({
        data: { userId, walletId: wallet.id, type: "SHOP_PURCHASE", provider: "wallet", amountCoins: -theme.priceCoins, metadata: JSON.stringify({ themeId }) }
      });
    }
    await tx.ownedTheme.create({ data: { userId, themeId, source: scoreUnlock ? "score" : theme.type } });
  });
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
