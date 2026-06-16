import type { SkinDto, WalletDto } from "@waves/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { mapSkinDto } from "./skinCatalogService.js";

type SkinRecord = Parameters<typeof mapSkinDto>[0] & { id: string };

type OwnedSkinRecord = {
  skinId: string;
  ownedAt: Date;
  skin: SkinRecord;
};

function toWalletDto(wallet: { coins: number; gems: number; rouletteTickets: number; extraLives: number; lifetimeCoins: number }): WalletDto {
  return {
    coins: wallet.coins,
    gems: wallet.gems,
    rouletteTickets: wallet.rouletteTickets,
    extraLives: wallet.extraLives,
    lifetimeCoins: wallet.lifetimeCoins
  };
}

const rarityRank: Record<string, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
  limited: 4,
  event: 5,
  premium: 6
};

const categoryRank: Record<string, number> = {
  arrow: 0,
  trail: 1,
  line: 2,
  effect: 3,
  background: 4,
  deathEffect: 5,
  profileFrame: 6,
  badge: 7
};

function sortShopSkin(a: SkinDto & { owned: boolean; equipped: boolean }, b: SkinDto & { owned: boolean; equipped: boolean }) {
  return (
    (rarityRank[a.rarity] ?? 99) - (rarityRank[b.rarity] ?? 99) ||
    (categoryRank[a.category] ?? 99) - (categoryRank[b.category] ?? 99) ||
    a.priceGems - b.priceGems ||
    a.priceCoins - b.priceCoins ||
    a.slug.localeCompare(b.slug)
  );
}

function sortOwnedSkin(a: SkinDto & { owned: boolean; equipped: boolean }, b: SkinDto & { owned: boolean; equipped: boolean }) {
  return Number(b.equipped) - Number(a.equipped) || sortShopSkin(a, b);
}

export async function listShopSkins(userId?: string): Promise<Array<SkinDto & { owned: boolean; equipped: boolean }>> {
  const [skins, owned, profile] = await Promise.all([
    prisma.skin.findMany({ where: { active: true }, orderBy: [{ rarity: "asc" }, { priceCoins: "asc" }] }),
    userId ? prisma.ownedSkin.findMany({ where: { userId } }) : Promise.resolve([]),
    userId ? prisma.userProfile.findUnique({ where: { userId } }) : Promise.resolve(null)
  ]);

  const ownedSkinIds = new Set(owned.map((item: { skinId: string }) => item.skinId));
  return skins.map((skin: SkinRecord) => {
    const dto = mapSkinDto(skin);
    return {
      ...dto,
      owned: ownedSkinIds.has(skin.id),
      equipped: skin.id === profile?.selectedArrowSkinId || skin.id === profile?.selectedTrailSkinId
    };
  }).sort(sortShopSkin);
}

export async function getOwnedSkins(userId: string) {
  const owned = await prisma.ownedSkin.findMany({
    where: { userId },
    include: { skin: true },
    orderBy: { ownedAt: "desc" }
  });

  const profile = await prisma.userProfile.findUnique({ where: { userId } });

  return owned.map((item: OwnedSkinRecord) => ({
    ...mapSkinDto(item.skin),
    owned: true,
    equipped: item.skinId === profile?.selectedArrowSkinId || item.skinId === profile?.selectedTrailSkinId,
    ownedAt: item.ownedAt.toISOString()
  })).sort(sortOwnedSkin);
}

export async function buySkin(userId: string, skinId: string): Promise<{ skin: SkinDto; wallet: WalletDto }> {
  const skin = await prisma.skin.findFirst({ where: { id: skinId, active: true } });
  if (!skin) {
    throw new AppError(404, "Skin not found.", "SKIN_NOT_FOUND");
  }

  const alreadyOwned = await prisma.ownedSkin.findUnique({
    where: { userId_skinId: { userId, skinId } }
  });

  if (alreadyOwned) {
    throw new AppError(409, "Skin already owned.", "SKIN_ALREADY_OWNED");
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    throw new AppError(404, "Wallet not found.", "WALLET_NOT_FOUND");
  }

  if (skin.priceCoins > wallet.coins || skin.priceGems > wallet.gems) {
    throw new AppError(402, "Not enough currency.", "INSUFFICIENT_FUNDS");
  }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: {
        coins: { decrement: skin.priceCoins },
        gems: { decrement: skin.priceGems }
      }
    });

    await tx.ownedSkin.create({ data: { userId, skinId } });

    await tx.purchaseTransaction.create({
      data: {
        userId,
        skinId,
        provider: "wallet",
        type: "skin",
        status: "completed",
        amountCoins: skin.priceCoins,
        amountGems: skin.priceGems
      }
    });

    return updatedWallet;
  });

  return {
    skin: mapSkinDto(skin),
    wallet: toWalletDto(result)
  };
}

export async function equipSkin(userId: string, skinId: string) {
  const owned = await prisma.ownedSkin.findUnique({
    where: { userId_skinId: { userId, skinId } },
    include: { skin: true }
  });

  if (!owned) {
    throw new AppError(403, "You do not own this skin.", "SKIN_NOT_OWNED");
  }

  const data =
    owned.skin.category === "arrow"
      ? { selectedArrowSkinId: skinId }
      : { selectedTrailSkinId: skinId };

  await prisma.userProfile.update({
    where: { userId },
    data
  });

  return getOwnedSkins(userId);
}
