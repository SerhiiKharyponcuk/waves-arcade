import type { SkinDto } from "@waves/shared";
import { prisma } from "../config/prisma.js";
import { skinCatalog } from "../data/skinCatalog.js";

export async function ensureSkinCatalog() {
  const existingCount = await prisma.skin.count();
  if (existingCount >= skinCatalog.length) {
    return;
  }

  for (const skin of skinCatalog) {
    await prisma.skin.upsert({
      where: { slug: skin.slug },
      update: {
        nameKey: skin.nameKey,
        descriptionKey: skin.descriptionKey,
        category: skin.category,
        rarity: skin.rarity,
        priceCoins: skin.priceCoins,
        priceGems: skin.priceGems,
        isPremium: skin.isPremium,
        isLimited: skin.isLimited,
        active: true,
        visualJson: JSON.stringify(skin.visual)
      },
      create: {
        slug: skin.slug,
        nameKey: skin.nameKey,
        descriptionKey: skin.descriptionKey,
        category: skin.category,
        rarity: skin.rarity,
        priceCoins: skin.priceCoins,
        priceGems: skin.priceGems,
        isPremium: skin.isPremium,
        isLimited: skin.isLimited,
        active: true,
        visualJson: JSON.stringify(skin.visual)
      }
    });
  }
}

export function mapSkinDto(skin: {
  id: string;
  slug: string;
  nameKey: string;
  descriptionKey: string;
  category: string;
  rarity: string;
  priceCoins: number;
  priceGems: number;
  isPremium: boolean;
  isLimited: boolean;
  visualJson: unknown;
}): SkinDto {
  return {
    id: skin.id,
    slug: skin.slug,
    nameKey: skin.nameKey,
    descriptionKey: skin.descriptionKey,
    category: skin.category as SkinDto["category"],
    rarity: skin.rarity as SkinDto["rarity"],
    priceCoins: skin.priceCoins,
    priceGems: skin.priceGems,
    isPremium: skin.isPremium,
    isLimited: skin.isLimited,
    unlockType: skin.isPremium ? "premium" : skin.priceCoins > 0 || skin.priceGems > 0 ? "coins" : "free",
    visual: parseVisual(skin.visualJson)
  };
}

function parseVisual(value: unknown): SkinDto["visual"] {
  if (typeof value === "string") {
    return JSON.parse(value) as SkinDto["visual"];
  }

  return value as SkinDto["visual"];
}
