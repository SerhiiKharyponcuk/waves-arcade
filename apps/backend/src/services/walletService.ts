import type { AdPlacement, AdProvider, AdRewardCompleteDto, AdRewardSessionDto, DailyRewardDto, SubscriptionBenefitsDto, WalletDto } from "@waves/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";
import { paymentProvider } from "./paymentProvider.js";
import { mapSkinDto } from "./skinCatalogService.js";

type RouletteOutcome = {
  type: "coins" | "gems" | "rouletteTicket" | "extraLife" | "skin" | "premiumTrial";
  amount: number;
  rarity: "common" | "rare" | "epic" | "legendary" | "premium";
  reward: { coins?: number; gems?: number; tickets?: number; extraLives?: number; lifetimeCoins?: number };
  skinId: string | null;
  rewardSkin?: ReturnType<typeof mapSkinDto>;
};

type WalletBalanceUpdateData = {
  coins?: { increment: number };
  gems?: { increment: number };
  rouletteTickets?: { increment: number };
  extraLives?: { increment: number };
  lifetimeCoins?: { increment: number };
};

type SkinRecord = Parameters<typeof mapSkinDto>[0] & { id: string };
type OwnedSkinIdRecord = { skinId: string };

function toWalletDto(wallet: {
  coins: number;
  gems: number;
  rouletteTickets: number;
  extraLives: number;
  lifetimeCoins: number;
}): WalletDto {
  return {
    coins: wallet.coins,
    gems: wallet.gems,
    rouletteTickets: wallet.rouletteTickets,
    extraLives: wallet.extraLives,
    lifetimeCoins: wallet.lifetimeCoins
  };
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function requiredAdsForRouletteSpin(completedSpins: number) {
  if (completedSpins === 0) {
    return 0;
  }

  return Math.min(6, Math.ceil(completedSpins / 2));
}

function remainingAdsForRouletteSpin(completedSpins: number, availableTickets: number) {
  return Math.max(0, requiredAdsForRouletteSpin(completedSpins) - availableTickets);
}

function resolveAdReward(placement: AdPlacement) {
  const rewardByPlacement = {
    coins: {
      changes: { coins: 120, gems: 0, tickets: 0, extraLives: 0, lifetimeCoins: 120 },
      rewardType: "coins",
      rewardAmount: 120
    },
    roulette: {
      changes: { coins: 0, gems: 0, tickets: 1, extraLives: 0, lifetimeCoins: 0 },
      rewardType: "rouletteTicket",
      rewardAmount: 1
    },
    continue: {
      changes: { coins: 0, gems: 0, tickets: 0, extraLives: 1, lifetimeCoins: 0 },
      rewardType: "extraLife",
      rewardAmount: 1
    }
  } as const;

  return rewardByPlacement[placement] ?? rewardByPlacement.coins;
}

async function ensureDailyClaim(userId: string) {
  const existing = await prisma.dailyRewardClaim.findUnique({ where: { userId } });
  if (existing) {
    return existing;
  }

  return prisma.dailyRewardClaim.create({ data: { userId } });
}

async function logWalletTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  walletId: string,
  type: string,
  provider: string,
  changes: { coins?: number; gems?: number; tickets?: number; extraLives?: number },
  metadata?: Record<string, unknown>
) {
  await tx.walletTransaction.create({
    data: {
      userId,
      walletId,
      type,
      provider,
      amountCoins: changes.coins ?? 0,
      amountGems: changes.gems ?? 0,
      amountTickets: changes.tickets ?? 0,
      amountExtraLives: changes.extraLives ?? 0,
      metadata: metadata ? JSON.stringify(metadata) : undefined
    }
  });
}

async function updateWalletBalance(
  tx: Prisma.TransactionClient,
  userId: string,
  changes: { coins?: number; gems?: number; tickets?: number; extraLives?: number; lifetimeCoins?: number },
  provider: string,
  type: string,
  metadata?: Record<string, unknown>
) {
  const data: WalletBalanceUpdateData = {
    coins: changes.coins ? { increment: changes.coins } : undefined,
    gems: changes.gems ? { increment: changes.gems } : undefined,
    rouletteTickets: changes.tickets ? { increment: changes.tickets } : undefined,
    extraLives: changes.extraLives ? { increment: changes.extraLives } : undefined,
    lifetimeCoins: changes.lifetimeCoins ? { increment: changes.lifetimeCoins } : undefined
  };

  const hasBalanceChanges = Object.values(data).some(Boolean);
  const wallet = hasBalanceChanges
    ? await tx.wallet.update({
        where: { userId },
        data
      })
    : await tx.wallet.findUniqueOrThrow({ where: { userId } });

  await logWalletTransaction(tx, userId, wallet.id, type, provider, {
    coins: changes.coins ?? 0,
    gems: changes.gems ?? 0,
    tickets: changes.tickets ?? 0,
    extraLives: changes.extraLives ?? 0
  }, metadata);

  return wallet;
}

export async function getWallet(userId: string): Promise<WalletDto> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    throw new AppError(404, "Wallet not found.", "WALLET_NOT_FOUND");
  }
  return toWalletDto(wallet);
}

export async function getDailyRewardStatus(userId: string): Promise<DailyRewardDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true, dailyClaim: true }
  });

  if (!user) {
    throw new AppError(404, "User not found.", "USER_NOT_FOUND");
  }

  const claimRow = user.dailyClaim ?? (await ensureDailyClaim(userId));
  const today = startOfUtcDay(new Date());
  const lastClaimDay = claimRow.lastClaimAt ? startOfUtcDay(claimRow.lastClaimAt) : null;
  const canClaim = !lastClaimDay || lastClaimDay.getTime() < today.getTime();
  const nextStreak = lastClaimDay && lastClaimDay.getTime() === today.getTime() - 86_400_000 ? claimRow.streak + 1 : 1;
  const schedule = [
    { coins: 120, gems: 0, tickets: 0, lives: 0 },
    { coins: 0, gems: 0, tickets: 1, lives: 0 },
    { coins: 0, gems: 0, tickets: 0, lives: 1 },
    { coins: 0, gems: 18, tickets: 0, lives: 0 },
    { coins: 180, gems: 0, tickets: 1, lives: 0 },
    { coins: 260, gems: 0, tickets: 0, lives: 0 },
    { coins: 0, gems: 0, tickets: 1, lives: 0 }
  ];

  const todayReward = schedule[(nextStreak - 1) % schedule.length]!;
  const hasPremium = user.subscription?.status === "premium_active" || user.subscription?.status === "trial_active";
  const bonusGems = hasPremium ? 8 : 0;
  const bonusTickets = hasPremium ? 1 : 0;
  const bonusLives = hasPremium ? 1 : 0;

  return {
    canClaim,
    streak: claimRow.streak,
    rewardCoins: todayReward.coins,
    rewardGems: todayReward.gems + bonusGems,
    rewardTickets: todayReward.tickets + bonusTickets,
    rewardLives: todayReward.lives + bonusLives,
    premiumBonus: hasPremium,
    nextClaimAt: canClaim ? undefined : new Date(today.getTime() + 86_400_000).toISOString()
  };
}

export async function claimDailyReward(userId: string): Promise<{ reward: DailyRewardDto; wallet: WalletDto }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true, dailyClaim: true }
  });

  if (!user) {
    throw new AppError(404, "User not found.", "USER_NOT_FOUND");
  }

  const claimRow = user.dailyClaim ?? (await ensureDailyClaim(userId));
  const today = startOfUtcDay(new Date());
  const lastClaimDay = claimRow.lastClaimAt ? startOfUtcDay(claimRow.lastClaimAt) : null;

  if (lastClaimDay && lastClaimDay.getTime() >= today.getTime()) {
    throw new AppError(409, "Daily reward already claimed.", "DAILY_REWARD_ALREADY_CLAIMED");
  }

  const yesterday = new Date(today.getTime() - 86_400_000);
  const streakContinues = lastClaimDay?.getTime() === yesterday.getTime();
  const nextStreak = streakContinues ? claimRow.streak + 1 : 1;

  const schedule = [
    { coins: 120, gems: 0, tickets: 0, lives: 0 },
    { coins: 0, gems: 0, tickets: 1, lives: 0 },
    { coins: 0, gems: 0, tickets: 0, lives: 1 },
    { coins: 0, gems: 18, tickets: 0, lives: 0 },
    { coins: 180, gems: 0, tickets: 1, lives: 0 },
    { coins: 260, gems: 0, tickets: 0, lives: 0 },
    { coins: 0, gems: 0, tickets: 1, lives: 0 }
  ];

  const dailyReward = schedule[(nextStreak - 1) % schedule.length]!;
  const hasPremium = user.subscription?.status === "premium_active" || user.subscription?.status === "trial_active";
  const rewardGems = dailyReward.gems + (hasPremium ? 8 : 0);
  const rewardTickets = dailyReward.tickets + (hasPremium ? 1 : 0);
  const rewardLives = dailyReward.lives + (hasPremium ? 1 : 0);

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updatedClaim = await tx.dailyRewardClaim.update({
      where: { userId },
      data: {
        lastClaimAt: new Date(),
        streak: nextStreak
      }
    });

    const wallet = await updateWalletBalance(
      tx,
      userId,
      {
        coins: dailyReward.coins,
        gems: rewardGems,
        tickets: rewardTickets,
        extraLives: rewardLives,
        lifetimeCoins: dailyReward.coins
      },
      "daily_reward",
      "DAILY_REWARD",
      {
        streak: nextStreak,
        premiumBonus: hasPremium
      }
    );

    await tx.purchaseTransaction.create({
      data: {
        userId,
        provider: "daily_reward",
        type: "daily_reward",
        status: "completed",
        amountCoins: dailyReward.coins,
        amountGems: rewardGems,
        amountTickets: rewardTickets,
        amountExtraLives: rewardLives,
        metadata: JSON.stringify({ streak: nextStreak, premiumBonus: hasPremium })
      }
    });

    return { wallet, updatedClaim };
  });

  return {
    reward: {
      canClaim: false,
      streak: nextStreak,
      rewardCoins: dailyReward.coins,
      rewardGems,
      rewardTickets,
      rewardLives,
      premiumBonus: hasPremium,
      nextClaimAt: new Date(today.getTime() + 86_400_000).toISOString()
    },
    wallet: toWalletDto(result.wallet)
  };
}

export async function createPurchasePlaceholder(
  userId: string,
  input: { sku: string; amountCents: number; currency: "USD" | "EUR"; provider: "stripe" | "google_play" | "apple_iap" | "placeholder" }
) {
  const intent = await paymentProvider.createPaymentIntent({ userId, ...input });

  await prisma.purchaseTransaction.create({
    data: {
      userId,
      provider: input.provider,
      type: "currency",
      status: "pending",
      metadata: JSON.stringify({
        sku: input.sku,
        amountCents: input.amountCents,
        currency: input.currency,
        externalId: intent.externalId
      })
    }
  });

  return intent;
}

async function awardWalletReward(
  userId: string,
  reward: { coins?: number; gems?: number; tickets?: number; extraLives?: number; lifetimeCoins?: number },
  provider: string,
  type: string,
  metadata: Record<string, unknown>
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const wallet = await updateWalletBalance(tx, userId, reward, provider, type, metadata);
    return toWalletDto(wallet);
  });
}

export async function getRouletteConfig(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true, subscription: true }
  });

  if (!user || !user.wallet) {
    throw new AppError(404, "User not found.", "USER_NOT_FOUND");
  }

  const isPremium = user.subscription?.status === "premium_active" || user.subscription?.status === "trial_active";
  const spinCount = await prisma.rouletteSpin.count({ where: { userId } });
  const freeSpinAvailable = spinCount === 0;
  const nextSpinCostAds = remainingAdsForRouletteSpin(spinCount, user.wallet.rouletteTickets);

  return {
    freeDailySpins: freeSpinAvailable ? 1 : 0,
    premiumExtraSpins: isPremium ? 1 : 0,
    cooldownSeconds: 0,
    probabilities: {
      coins: 0.32,
      gems: 0.24,
      rouletteTicket: 0.16,
      extraLife: 0.12,
      skin: 0.1,
      premiumTrial: 0.06
    },
    categories: [
      { label: "coins", color: "#f9c74f", rarity: "common", rewardType: "coins", displayValue: "250" },
      { label: "gems", color: "#3ddcff", rarity: "rare", rewardType: "gems", displayValue: "16" },
      { label: "ticket", color: "#8b5cf6", rarity: "rare", rewardType: "rouletteTicket", displayValue: "x1" },
      { label: "extra life", color: "#fb7185", rarity: "epic", rewardType: "extraLife", displayValue: "+1" },
      { label: "skin", color: "#22c55e", rarity: "legendary", rewardType: "skin", displayValue: "SKIN" },
      { label: "premium trial", color: "#f59e0b", rarity: "legendary", rewardType: "premiumTrial", displayValue: "VIP" }
    ],
    nextSpinCostAds
  };
}

export async function spinRoulette(userId: string, adsWatched: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true, subscription: true }
  });

  if (!user || !user.wallet) {
    throw new AppError(404, "User not found.", "USER_NOT_FOUND");
  }

  const spinCount = await prisma.rouletteSpin.count({ where: { userId } });
  const requiredAds = requiredAdsForRouletteSpin(spinCount);

  if (user.wallet.rouletteTickets < requiredAds) {
    throw new AppError(400, "Watch rewarded ads to unlock this spin.", "AD_WATCH_REQUIRED");
  }

  const outcome = await getRouletteOutcome(userId);
  const reward = outcome.reward;

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const wallet = await updateWalletBalance(tx, userId, {
      ...reward,
      tickets: (reward.tickets ?? 0) - requiredAds
    }, "roulette", "ROULETTE_REWARD", {
      spinNumber: spinCount + 1,
      adsWatched,
      consumedAdTickets: requiredAds,
      rewardType: outcome.type,
      rewardAmount: outcome.amount
    });

    if (outcome.type === "skin" && outcome.skinId) {
      await tx.ownedSkin.upsert({
        where: { userId_skinId: { userId, skinId: outcome.skinId } },
        update: {},
        create: { userId, skinId: outcome.skinId }
      });
    }

    const spin = await tx.rouletteSpin.create({
      data: {
        userId,
        walletId: wallet.id,
        rewardType: outcome.type,
        rewardAmount: outcome.amount,
        rarity: outcome.rarity,
        rewardSkinId: outcome.skinId ?? null
      }
    });

    return { wallet, spin };
  });

  const nextSpinCostAds = remainingAdsForRouletteSpin(spinCount + 1, result.wallet.rouletteTickets);

  return {
    wallet: toWalletDto(result.wallet),
    spin: {
      id: result.spin.id,
      rewardType: outcome.type,
      rewardAmount: outcome.amount,
      rewardSkinId: outcome.skinId ?? undefined,
      rewardSkin: outcome.rewardSkin,
      rarity: outcome.rarity,
      createdAt: result.spin.createdAt.toISOString()
    },
    nextSpinCostAds
  };
}

export async function startAdRewardSession(
  userId: string,
  placement: AdPlacement = "coins",
  provider: AdProvider = env.AD_PROVIDER
): Promise<AdRewardSessionDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true }
  });

  if (!user || !user.wallet) {
    throw new AppError(404, "User not found.", "USER_NOT_FOUND");
  }

  const selectedReward = resolveAdReward(placement);
  const selectedProvider = env.NODE_ENV === "production" ? env.AD_PROVIDER : provider;
  const adReward = await prisma.adReward.create({
    data: {
      userId,
      walletId: user.wallet.id,
      provider: selectedProvider,
      rewardType: selectedReward.rewardType,
      rewardAmount: selectedReward.rewardAmount,
      status: "pending"
    }
  });

  return {
    adSessionId: adReward.id,
    provider: selectedProvider,
    placement,
    rewardType: selectedReward.rewardType,
    rewardAmount: selectedReward.rewardAmount,
    expiresAt: new Date(adReward.createdAt.getTime() + env.AD_SESSION_TTL_SECONDS * 1000).toISOString()
  };
}

export async function completeAdRewardSession(
  userId: string,
  input: {
    adSessionId: string;
    provider?: AdProvider;
    providerEventId?: string;
    providerPayload?: Record<string, unknown>;
  }
): Promise<AdRewardCompleteDto> {
  const adReward = await prisma.adReward.findFirst({
    where: {
      id: input.adSessionId,
      userId
    },
    include: { wallet: true }
  });

  if (!adReward) {
    throw new AppError(404, "Ad reward session not found.", "AD_SESSION_NOT_FOUND");
  }

  if (adReward.status !== "pending") {
    throw new AppError(409, "Ad reward session already completed.", "AD_SESSION_ALREADY_USED");
  }

  const ageMs = Date.now() - adReward.createdAt.getTime();
  if (ageMs > env.AD_SESSION_TTL_SECONDS * 1000) {
    await prisma.adReward.update({
      where: { id: adReward.id },
      data: { status: "failed" }
    });
    throw new AppError(410, "Ad reward session expired.", "AD_SESSION_EXPIRED");
  }

  const placement = resolvePlacementFromReward(adReward.rewardType);
  const selectedReward = resolveAdReward(placement);
  const provider = adReward.provider as AdProvider;
  if (input.provider && input.provider !== provider) {
    throw new AppError(400, "Ad provider mismatch.", "AD_PROVIDER_MISMATCH");
  }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updatedAdReward = await tx.adReward.update({
      where: { id: adReward.id },
      data: { status: "completed" }
    });

    const wallet = await updateWalletBalance(
      tx,
      userId,
      selectedReward.changes,
      `rewarded_ad_${provider}`,
      "AD_REWARD",
      {
        adSessionId: adReward.id,
        provider,
        providerEventId: input.providerEventId,
        providerPayload: input.providerPayload,
        placement,
        rewardType: selectedReward.rewardType
      }
    );

    return { updatedAdReward, wallet };
  });

  return {
    wallet: toWalletDto(result.wallet),
    reward: {
      type: selectedReward.rewardType,
      amount: selectedReward.rewardAmount
    },
    adReward: {
      id: result.updatedAdReward.id,
      provider: result.updatedAdReward.provider,
      placement,
      rewardType: result.updatedAdReward.rewardType as AdRewardCompleteDto["adReward"]["rewardType"],
      rewardAmount: result.updatedAdReward.rewardAmount,
      status: result.updatedAdReward.status as AdRewardCompleteDto["adReward"]["status"],
      createdAt: result.updatedAdReward.createdAt.toISOString()
    }
  };
}

export async function watchAdReward(userId: string, placement: AdPlacement = "coins") {
  if (env.NODE_ENV === "production") {
    throw new AppError(410, "Legacy ad reward endpoint is disabled in production.", "LEGACY_AD_REWARD_DISABLED");
  }

  const session = await startAdRewardSession(userId, placement, "mock");
  return completeAdRewardSession(userId, {
    adSessionId: session.adSessionId,
    provider: "mock",
    providerEventId: `legacy-${session.adSessionId}`
  });
}

function resolvePlacementFromReward(rewardType: string): AdPlacement {
  if (rewardType === "rouletteTicket") {
    return "roulette";
  }
  if (rewardType === "extraLife") {
    return "continue";
  }
  return "coins";
}

export async function getSubscriptionBenefits(userId: string): Promise<SubscriptionBenefitsDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true }
  });

  if (!user) {
    throw new AppError(404, "User not found.", "USER_NOT_FOUND");
  }

  const isPremium = user.subscription?.status === "premium_active" || user.subscription?.status === "trial_active";

  return {
    premiumOnlySkins: 6,
    extraDailySpins: 1,
    extraDailyGems: 8,
    extraLivesPerRun: 1,
    noAds: isPremium,
    premiumBadge: isPremium ? "VIP Pilot" : "Premium Pilot",
    betterDailyRewards: true
  };
}

async function getRouletteOutcome(userId: string): Promise<RouletteOutcome> {
  const roll = Math.random();
  if (roll < 0.32) {
    return {
      type: "coins" as const,
      amount: 250,
      rarity: "common" as const,
      reward: { coins: 250, lifetimeCoins: 250 },
      skinId: null
    };
  }
  if (roll < 0.56) {
    return {
      type: "gems" as const,
      amount: 16,
      rarity: "rare" as const,
      reward: { gems: 16 },
      skinId: null
    };
  }
  if (roll < 0.72) {
    return {
      type: "rouletteTicket" as const,
      amount: 1,
      rarity: "rare" as const,
      reward: { tickets: 1 },
      skinId: null
    };
  }
  if (roll < 0.84) {
    return {
      type: "extraLife" as const,
      amount: 1,
      rarity: "epic" as const,
      reward: { extraLives: 1 },
      skinId: null
    };
  }
  if (roll < 0.94) {
    const owned = await prisma.ownedSkin.findMany({ where: { userId }, select: { skinId: true } });
    const ownedIds = new Set(owned.map((item: OwnedSkinIdRecord) => item.skinId));
    const candidates = await prisma.skin.findMany({
      where: {
        active: true,
        isPremium: false
      }
    });
    const availableSkins = candidates.filter((skin: SkinRecord) => !ownedIds.has(skin.id));
    const selectedSkin = availableSkins[Math.floor(Math.random() * availableSkins.length)];

    if (selectedSkin) {
      return {
        type: "skin" as const,
        amount: 1,
        rarity: selectedSkin.rarity as RouletteOutcome["rarity"],
        reward: {},
        skinId: selectedSkin.id,
        rewardSkin: mapSkinDto(selectedSkin)
      };
    }
  }

  return {
    type: "premiumTrial" as const,
    amount: 0,
    rarity: "legendary" as const,
    reward: {},
    skinId: null
  };
}

export async function grantWalletReward(
  userId: string,
  changes: { coins?: number; gems?: number; tickets?: number; extraLives?: number; lifetimeCoins?: number },
  provider: string,
  type: string,
  metadata?: Record<string, unknown>
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const wallet = await updateWalletBalance(tx, userId, changes, provider, type, metadata);
    return toWalletDto(wallet);
  });
}
