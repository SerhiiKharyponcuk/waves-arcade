import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { skinCatalog } from "../src/data/skinCatalog.js";

config({ path: new URL("../.env", import.meta.url) });

const prisma = new PrismaClient();
const testEmail = "test@waves.local";
const testPassword = "Test1234!";

async function main() {
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

  const starterArrow = await prisma.skin.findUniqueOrThrow({ where: { slug: "cyber-green" } });
  const starterTrail = await prisma.skin.findUniqueOrThrow({ where: { slug: "neon-blue-trail" } });
  const passwordHash = await bcrypt.hash(testPassword, 12);

  const testUser = await prisma.user.upsert({
    where: { email: testEmail },
    update: { passwordHash },
    create: {
      email: testEmail,
      passwordHash
    }
  });

  await prisma.userProfile.upsert({
    where: { userId: testUser.id },
    update: {
      displayName: "Test Pilot",
      locale: "uk",
      selectedArrowSkinId: starterArrow.id,
      selectedTrailSkinId: starterTrail.id
    },
    create: {
      userId: testUser.id,
      displayName: "Test Pilot",
      locale: "uk",
      selectedArrowSkinId: starterArrow.id,
      selectedTrailSkinId: starterTrail.id
    }
  });

  await prisma.wallet.upsert({
    where: { userId: testUser.id },
    update: {
      coins: 5000,
      gems: 250,
      lifetimeCoins: 5000
    },
    create: {
      userId: testUser.id,
      coins: 5000,
      gems: 250,
      lifetimeCoins: 5000
    }
  });

  for (const skinId of [starterArrow.id, starterTrail.id]) {
    await prisma.ownedSkin.upsert({
      where: { userId_skinId: { userId: testUser.id, skinId } },
      update: {},
      create: { userId: testUser.id, skinId }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log(`Seeded skin catalog and test account: ${testEmail} / ${testPassword}`);
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
