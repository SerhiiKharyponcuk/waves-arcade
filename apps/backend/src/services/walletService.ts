import { findPaymentProduct, type AdPlacement, type AdProvider, type AdRewardCompleteDto, type AdRewardSessionDto, type DailyRewardDto, type PaymentCurrency, type SubscriptionBenefitsDto, type WalletDto } from "@waves/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";
import { assertNoActiveRestriction } from "./restrictionService.js";
import { paymentProvider, type PaymentProviderId } from "./paymentProvider.js";
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
type KnownPrismaError = { code?: string };
type PurchasePlaceholderInput = {
  sku: string;
  amountCents?: number;
  supportAmountCents: number;
  currency: PaymentCurrency;
  provider: PaymentProviderId;
  idempotencyKey: string;
};

function isKnownPrismaError(error: unknown, code: string): error is KnownPrismaError {
  return Boolean(error && typeof error === "object" && "code" in error && (error as KnownPrismaError).code === code);
}

function rethrowSafeWalletMutationError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }
  if (isKnownPrismaError(error, "P2002")) {
    throw new AppError(409, "This transaction was already processed.", "DUPLICATE_TRANSACTION");
  }
  if (isKnownPrismaError(error, "P1008") || isKnownPrismaError(error, "P2028") || isKnownPrismaError(error, "P2034")) {
    throw new AppError(409, "This wallet action is already being processed. Please refresh and try again.", "WALLET_ACTION_CONFLICT");
  }
  throw error;
}

function calculatePaymentOrder(input: PurchasePlaceholderInput) {
  const product = findPaymentProduct(input.sku);
  if (!product) {
    throw new AppError(400, "Unknown payment product.", "UNKNOWN_PAYMENT_SKU");
  }
  if (input.currency !== product.currency) {
    throw new AppError(400, "Currency does not match this product.", "PAYMENT_CURRENCY_MISMATCH");
  }

  const supportAmountCents = input.supportAmountCents ?? 0;
  if (supportAmountCents !== 0 && supportAmountCents < 100) {
    throw new AppError(400, "Support amount must be at least 1.00 when enabled.", "SUPPORT_AMOUNT_TOO_SMALL");
  }

  const amountCents = product.amountCents + supportAmountCents;
  if (input.amountCents !== undefined && input.amountCents !== amountCents) {
    throw new AppError(400, "Payment amount does not match the server price.", "PAYMENT_AMOUNT_MISMATCH");
  }

  return {
    sku: input.sku,
    type: product.kind,
    currency: product.currency,
    productAmountCents: product.amountCents,
    supportAmountCents,
    amountCents,
    grants: {
      coins: product.coins ?? 0,
      premiumDays: product.premiumDays ?? 0,
      skinSlug: product.skinSlug ?? null
    }
  };
}

function idempotencyPayloadMatches(metadata: Record<string, unknown>, order: ReturnType<typeof calculatePaymentOrder>) {
  return (
    metadata.sku === order.sku &&
    metadata.currency === order.currency &&
    metadata.amountCents === order.amountCents &&
    metadata.productAmountCents === order.productAmountCents &&
    metadata.supportAmountCents === order.supportAmountCents &&
    JSON.stringify(metadata.grants ?? {}) === JSON.stringify(order.grants)
  );
}

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
  return prisma.dailyRewardClaim.upsert({
    where: { userId },
    update: {},
    create: { userId }
  });
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
  await assertNoActiveRestriction(userId, ["rewards_removed", "temporary_ban", "permanent_ban"], "Rewards");
  await ensureDailyClaim(userId);

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const [claimRow, subscription] = await Promise.all([
        tx.dailyRewardClaim.findUniqueOrThrow({ where: { userId } }),
        tx.subscription.findUnique({ where: { userId } })
      ]);
      const today = startOfUtcDay(new Date());
      const lastClaimDay = claimRow.lastClaimAt ? startOfUtcDay(claimRow.lastClaimAt) : null;
      const yesterday = new Date(today.getTime() - 86_400_000);
      const streakContinues = lastClaimDay?.getTime() === yesterday.getTime();
      const nextStreak = streakContinues ? claimRow.streak + 1 : 1;

      const claimUpdate = await tx.dailyRewardClaim.updateMany({
        where: {
          id: claimRow.id,
          OR: [{ lastClaimAt: null }, { lastClaimAt: { lt: today } }]
        },
        data: {
          lastClaimAt: new Date(),
          streak: nextStreak
        }
      });

      if (claimUpdate.count !== 1) {
        throw new AppError(409, "Daily reward already claimed.", "DAILY_REWARD_ALREADY_CLAIMED");
      }

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
      const hasPremium = subscription?.status === "premium_active" || subscription?.status === "trial_active";
      const rewardGems = dailyReward.gems + (hasPremium ? 8 : 0);
      const rewardTickets = dailyReward.tickets + (hasPremium ? 1 : 0);
      const rewardLives = dailyReward.lives + (hasPremium ? 1 : 0);

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
          idempotencyKey: `daily:${userId}:${today.toISOString().slice(0, 10)}`,
          metadata: JSON.stringify({ streak: nextStreak, premiumBonus: hasPremium })
        }
      });

      return { wallet, dailyReward, rewardGems, rewardTickets, rewardLives, hasPremium, nextStreak, today };
    });

    return {
      reward: {
        canClaim: false,
        streak: result.nextStreak,
        rewardCoins: result.dailyReward.coins,
        rewardGems: result.rewardGems,
        rewardTickets: result.rewardTickets,
        rewardLives: result.rewardLives,
        premiumBonus: result.hasPremium,
        nextClaimAt: new Date(result.today.getTime() + 86_400_000).toISOString()
      },
      wallet: toWalletDto(result.wallet)
    };
  } catch (error) {
    rethrowSafeWalletMutationError(error);
  }
}

export async function createPurchasePlaceholder(
  userId: string,
  input: PurchasePlaceholderInput
) {
  const order = calculatePaymentOrder(input);
  const existing = await prisma.purchaseTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    const metadata = existing.metadata ? parsePurchaseMetadata(existing.metadata) : {};
    if (!idempotencyPayloadMatches(metadata, order)) {
      throw new AppError(409, "Idempotency key was already used for a different payment request.", "IDEMPOTENCY_KEY_CONFLICT");
    }
    return {
      provider: existing.provider,
      externalId: metadata.externalId ?? `placeholder_${input.idempotencyKey}`,
      status: "requires_configuration" as const,
      message: `Payment provider "${existing.provider}" is not configured yet. Connect Stripe, Mollie, PayPal, Adyen, Google Play Billing, or Apple IAP here.`
    };
  }

  const intent = await paymentProvider.createPaymentIntent({ userId, ...input, amountCents: order.amountCents, currency: order.currency });

  try {
    await prisma.purchaseTransaction.create({
      data: {
        userId,
        provider: input.provider,
        type: order.type,
        status: "pending",
        idempotencyKey: input.idempotencyKey,
        metadata: JSON.stringify({
          sku: order.sku,
          amountCents: order.amountCents,
          productAmountCents: order.productAmountCents,
          supportAmountCents: order.supportAmountCents,
          currency: order.currency,
          grants: order.grants,
          externalId: intent.externalId
        })
      }
    });
  } catch (error) {
    rethrowSafeWalletMutationError(error);
  }

  return intent;
}

function parsePurchaseMetadata(metadata: string): Record<string, unknown> & { externalId?: string } {
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    return {
      ...parsed,
      externalId: typeof parsed.externalId === "string" ? parsed.externalId : undefined
    };
  } catch {
    return {};
  }
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
  await assertNoActiveRestriction(userId, ["rewards_removed", "temporary_ban", "permanent_ban"], "Roulette rewards");

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { wallet: true, subscription: true }
      });

      if (!user || !user.wallet) {
        throw new AppError(404, "User not found.", "USER_NOT_FOUND");
      }

      await tx.wallet.update({ where: { userId }, data: { updatedAt: new Date() } });
      const spinCount = await tx.rouletteSpin.count({ where: { userId } });
      const requiredAds = requiredAdsForRouletteSpin(spinCount);
      const outcome = await getRouletteOutcome(userId, tx);
      const reward = outcome.reward;
      const ticketDelta = (reward.tickets ?? 0) - requiredAds;
      const balanceData: WalletBalanceUpdateData = {
        coins: reward.coins ? { increment: reward.coins } : undefined,
        gems: reward.gems ? { increment: reward.gems } : undefined,
        rouletteTickets: ticketDelta ? { increment: ticketDelta } : undefined,
        extraLives: reward.extraLives ? { increment: reward.extraLives } : undefined,
        lifetimeCoins: reward.lifetimeCoins ? { increment: reward.lifetimeCoins } : undefined
      };

      const hasBalanceChanges = Object.values(balanceData).some(Boolean);
      if (hasBalanceChanges) {
        const walletUpdate = await tx.wallet.updateMany({
          where: { userId, rouletteTickets: { gte: requiredAds } },
          data: balanceData
        });
        if (walletUpdate.count !== 1) {
          throw new AppError(400, "Watch rewarded ads to unlock this spin.", "AD_WATCH_REQUIRED");
        }
      } else if (user.wallet.rouletteTickets < requiredAds) {
        throw new AppError(400, "Watch rewarded ads to unlock this spin.", "AD_WATCH_REQUIRED");
      }

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      await logWalletTransaction(tx, userId, wallet.id, "ROULETTE_REWARD", "roulette", {
        coins: reward.coins ?? 0,
        gems: reward.gems ?? 0,
        tickets: ticketDelta,
        extraLives: reward.extraLives ?? 0
      }, {
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

      return { wallet, spin, spinCount, outcome };
    });

    const nextSpinCostAds = remainingAdsForRouletteSpin(result.spinCount + 1, result.wallet.rouletteTickets);

    return {
      wallet: toWalletDto(result.wallet),
      spin: {
        id: result.spin.id,
        rewardType: result.outcome.type,
        rewardAmount: result.outcome.amount,
        rewardSkinId: result.outcome.skinId ?? undefined,
        rewardSkin: result.outcome.rewardSkin,
        rarity: result.outcome.rarity,
        createdAt: result.spin.createdAt.toISOString()
      },
      nextSpinCostAds
    };
  } catch (error) {
    rethrowSafeWalletMutationError(error);
  }
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
  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const adReward = await tx.adReward.findFirst({
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
        await tx.adReward.updateMany({
          where: { id: adReward.id, status: "pending" },
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
      if (env.NODE_ENV === "production") {
        throw new AppError(501, "Rewarded ad verification is not configured yet. Rewards must be confirmed by a server-side provider webhook.", "AD_VERIFICATION_REQUIRED");
      }

      const completed = await tx.adReward.updateMany({
        where: { id: adReward.id, userId, status: "pending" },
        data: { status: "completed" }
      });
      if (completed.count !== 1) {
        throw new AppError(409, "Ad reward session already completed.", "AD_SESSION_ALREADY_USED");
      }

      const updatedAdReward = await tx.adReward.findUniqueOrThrow({ where: { id: adReward.id } });
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

      return { updatedAdReward, wallet, placement, selectedReward };
    });

    return {
      wallet: toWalletDto(result.wallet),
      reward: {
        type: result.selectedReward.rewardType,
        amount: result.selectedReward.rewardAmount
      },
      adReward: {
        id: result.updatedAdReward.id,
        provider: result.updatedAdReward.provider,
        placement: result.placement,
        rewardType: result.updatedAdReward.rewardType as AdRewardCompleteDto["adReward"]["rewardType"],
        rewardAmount: result.updatedAdReward.rewardAmount,
        status: result.updatedAdReward.status as AdRewardCompleteDto["adReward"]["status"],
        createdAt: result.updatedAdReward.createdAt.toISOString()
      }
    };
  } catch (error) {
    rethrowSafeWalletMutationError(error);
  }
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

async function getRouletteOutcome(userId: string, client: Prisma.TransactionClient | typeof prisma = prisma): Promise<RouletteOutcome> {
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
    const owned = await client.ownedSkin.findMany({ where: { userId }, select: { skinId: true } });
    const ownedIds = new Set(owned.map((item: OwnedSkinIdRecord) => item.skinId));
    const candidates = await client.skin.findMany({
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
  await assertNoActiveRestriction(userId, ["rewards_removed", "temporary_ban", "permanent_ban"], "Ad rewards");
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const wallet = await updateWalletBalance(tx, userId, changes, provider, type, metadata);
    return toWalletDto(wallet);
  });
}
