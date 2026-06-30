import { findPaymentProduct, type AdPlacement, type AdProvider, type AdRewardCompleteDto, type AdRewardSessionDto, type DailyRewardDto, type PaymentCurrency, type SubscriptionBenefitsDto, type WalletDto } from "@waves/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";
import { assertNoActiveRestriction } from "./restrictionService.js";
import { createLiqPayCheckoutForm, decodeLiqPayData, verifyLiqPaySignature, type LiqPayCallbackPayload } from "./liqpayProvider.js";
import { getPaymentProvider, type PaymentProviderId } from "./paymentProvider.js";
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

type PurchaseGrants = {
  coins: number;
  premiumDays: number;
  skinSlug: string | null;
};

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9:_-]{24,160}$/;

type PurchaseMetadata = Record<string, unknown> & {
  sku?: string;
  amountCents?: number;
  productAmountCents?: number;
  supportAmountCents?: number;
  currency?: PaymentCurrency;
  grants?: PurchaseGrants;
  externalId?: string;
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

function assertStrongIdempotencyKey(idempotencyKey: string) {
  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    throw new AppError(400, "Payment request key is invalid.", "INVALID_IDEMPOTENCY_KEY");
  }
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

function toPurchaseMetadata(order: ReturnType<typeof calculatePaymentOrder>, externalId?: string): PurchaseMetadata {
  return {
    sku: order.sku,
    amountCents: order.amountCents,
    productAmountCents: order.productAmountCents,
    supportAmountCents: order.supportAmountCents,
    currency: order.currency,
    grants: order.grants,
    externalId
  };
}

function buildExistingPaymentIntentResponse(
  purchase: { userId: string; provider: string; status: string; idempotencyKey: string | null },
  metadata: PurchaseMetadata,
  fallbackIdempotencyKey: string
) {
  const orderId = purchase.idempotencyKey ?? fallbackIdempotencyKey;

  if (purchase.status === "initiating" || purchase.status === "processing") {
    throw new AppError(409, "Purchase is already processing. Refresh your wallet in a moment.", "PAYMENT_ALREADY_PROCESSING");
  }

  if (purchase.provider === "liqpay" && env.PAYMENT_PROVIDER === "liqpay") {
    return {
      provider: purchase.provider,
      externalId: metadata.externalId ?? orderId,
      status: "pending" as const,
      message: "LiqPay checkout session created.",
      checkoutUrl: `${new URL(env.LIQPAY_SERVER_URL!).origin}/api/payments/liqpay/checkout/${encodeURIComponent(orderId)}`
    };
  }

  return {
    provider: purchase.provider,
    externalId: metadata.externalId ?? `placeholder_${orderId}`,
    status: "requires_configuration" as const,
    message: `Payment provider "${purchase.provider}" is not configured yet. Connect Stripe, Mollie, PayPal, Adyen, Google Play Billing, or Apple IAP here.`
  };
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

function sanitizeProviderPayload(payload?: Record<string, unknown>) {
  if (!payload) return undefined;

  const safeEntries = Object.entries(payload)
    .filter(([key, value]) =>
      !/token|secret|password|cookie|authorization/i.test(key)
      && (["string", "number", "boolean"].includes(typeof value) || value === null)
    )
    .slice(0, 16)
    .map(([key, value]) => [key.slice(0, 60), typeof value === "string" ? value.slice(0, 160) : value] as const);

  return safeEntries.length ? Object.fromEntries(safeEntries) : undefined;
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
  await assertNoActiveRestriction(userId, ["shop_restriction", "temporary_ban", "permanent_ban"], "Payments");
  assertStrongIdempotencyKey(input.idempotencyKey);
  const order = calculatePaymentOrder(input);
  const initialMetadata = toPurchaseMetadata(order);
  let createdPurchase:
    | {
        id: string;
        userId: string;
        provider: string;
        status: string;
        idempotencyKey: string | null;
        metadata: string | null;
      }
    | null = null;

  try {
    createdPurchase = await prisma.purchaseTransaction.create({
      data: {
        userId,
        provider: input.provider,
        type: order.type,
        status: "initiating",
        idempotencyKey: input.idempotencyKey,
        metadata: JSON.stringify(initialMetadata)
      },
      select: {
        id: true,
        userId: true,
        provider: true,
        status: true,
        idempotencyKey: true,
        metadata: true
      }
    });
  } catch (error) {
    if (!isKnownPrismaError(error, "P2002")) {
      rethrowSafeWalletMutationError(error);
    }

    const existing = await prisma.purchaseTransaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: {
        userId: true,
        provider: true,
        status: true,
        idempotencyKey: true,
        metadata: true
      }
    });

    if (!existing || existing.userId !== userId) {
      throw new AppError(409, "Idempotency key is already in use.", "IDEMPOTENCY_KEY_CONFLICT");
    }

    const metadata = existing.metadata ? parsePurchaseMetadata(existing.metadata) : {};
    if (!idempotencyPayloadMatches(metadata, order)) {
      throw new AppError(409, "Idempotency key was already used for a different payment request.", "IDEMPOTENCY_KEY_CONFLICT");
    }

    return buildExistingPaymentIntentResponse(existing, metadata, input.idempotencyKey);
  }

  let intent;
  try {
    intent = await getPaymentProvider(input.provider).createPaymentIntent({
      userId,
      ...input,
      amountCents: order.amountCents,
      currency: order.currency
    });
  } catch (error) {
    if (createdPurchase?.id) {
      await prisma.purchaseTransaction.update({
        where: { id: createdPurchase.id },
        data: {
          status: "failed",
          metadata: JSON.stringify({
            ...initialMetadata,
            initializationFailedAt: new Date().toISOString()
          })
        }
      }).catch(() => undefined);
    }
    throw error;
  }

  try {
    await prisma.purchaseTransaction.update({
      where: { id: createdPurchase.id },
      data: {
        provider: input.provider,
        status: intent.status === "pending" ? "pending" : "requires_configuration",
        metadata: JSON.stringify(toPurchaseMetadata(order, intent.externalId))
      }
    });
  } catch (error) {
    rethrowSafeWalletMutationError(error);
  }

  return intent;
}

function parsePurchaseMetadata(metadata: string): PurchaseMetadata {
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    const grants = parsed.grants && typeof parsed.grants === "object" && !Array.isArray(parsed.grants)
      ? parsed.grants as Record<string, unknown>
      : {};
    return {
      ...parsed,
      externalId: typeof parsed.externalId === "string" ? parsed.externalId : undefined,
      sku: typeof parsed.sku === "string" ? parsed.sku : undefined,
      amountCents: typeof parsed.amountCents === "number" ? parsed.amountCents : undefined,
      productAmountCents: typeof parsed.productAmountCents === "number" ? parsed.productAmountCents : undefined,
      supportAmountCents: typeof parsed.supportAmountCents === "number" ? parsed.supportAmountCents : undefined,
      currency: parsed.currency === "UAH" || parsed.currency === "EUR" || parsed.currency === "USD" ? parsed.currency : undefined,
      grants: {
        coins: typeof grants.coins === "number" ? grants.coins : 0,
        premiumDays: typeof grants.premiumDays === "number" ? grants.premiumDays : 0,
        skinSlug: typeof grants.skinSlug === "string" ? grants.skinSlug : null
      }
    };
  } catch {
    return {};
  }
}

function purchaseStatusIsPaid(status: string | undefined) {
  return status === "success" || status === "sandbox";
}

async function activatePremiumSubscription(tx: Prisma.TransactionClient, userId: string, premiumDays: number, provider: string) {
  if (premiumDays <= 0) return;

  const current = await tx.subscription.findUnique({ where: { userId } });
  const now = new Date();
  const startBase = current?.endDate && current.endDate.getTime() > now.getTime() ? current.endDate : now;
  const endDate = new Date(startBase.getTime() + premiumDays * 86_400_000);

  await tx.subscription.upsert({
    where: { userId },
    update: {
      status: "premium_active",
      plan: premiumDays >= 90 ? "vip" : "premium",
      provider,
      startDate: current?.startDate ?? now,
      endDate,
      cancelAtPeriodEnd: false
    },
    create: {
      userId,
      status: "premium_active",
      plan: premiumDays >= 90 ? "vip" : "premium",
      provider,
      startDate: now,
      endDate,
      cancelAtPeriodEnd: false
    }
  });
}

async function grantPaidPurchase(
  tx: Prisma.TransactionClient,
  purchase: { id: string; userId: string; metadata: string | null; type: string },
  metadata: PurchaseMetadata,
  providerStatus: string,
  callbackPayload: LiqPayCallbackPayload
) {
  const grants = metadata.grants ?? { coins: 0, premiumDays: 0, skinSlug: null };
  let grantedSkinId: string | null = null;

  if (grants.coins > 0) {
    await updateWalletBalance(
      tx,
      purchase.userId,
      { coins: grants.coins, lifetimeCoins: grants.coins },
      "liqpay",
      "PURCHASE_PAYMENT",
      { purchaseId: purchase.id, sku: metadata.sku, providerStatus, transactionId: callbackPayload.transaction_id ?? null }
    );
  }

  if (grants.premiumDays > 0) {
    await activatePremiumSubscription(tx, purchase.userId, grants.premiumDays, "liqpay");
  }

  if (grants.skinSlug) {
    const skin = await tx.skin.findUnique({ where: { slug: grants.skinSlug } });
    if (!skin) {
      throw new AppError(500, "Configured paid skin was not found.", "PAID_SKIN_NOT_FOUND");
    }
    grantedSkinId = skin.id;
    await tx.ownedSkin.upsert({
      where: { userId_skinId: { userId: purchase.userId, skinId: skin.id } },
      update: {},
      create: { userId: purchase.userId, skinId: skin.id }
    });
  }

  await tx.purchaseTransaction.update({
    where: { id: purchase.id },
    data: {
      status: "completed",
      provider: "liqpay",
      skinId: grantedSkinId,
      amountCoins: grants.coins,
      metadata: JSON.stringify({
        ...metadata,
        completedAt: new Date().toISOString(),
        providerStatus,
        transactionId: callbackPayload.transaction_id ?? null,
        senderPhone: callbackPayload.sender_phone ?? null,
        errCode: callbackPayload.err_code ?? null,
        errDescription: callbackPayload.err_description ?? null
      })
    }
  });
}

export async function getLiqPayCheckoutSession(orderId: string) {
  assertStrongIdempotencyKey(orderId);
  const purchase = await prisma.purchaseTransaction.findUnique({ where: { idempotencyKey: orderId } });
  if (!purchase || purchase.provider !== "liqpay") {
    throw new AppError(404, "Payment order not found.", "PAYMENT_ORDER_NOT_FOUND");
  }
  if (purchase.status === "initiating") {
    throw new AppError(409, "Payment order is still being prepared.", "PAYMENT_ORDER_PREPARING");
  }
  if (purchase.status !== "pending") {
    throw new AppError(409, "This payment order is no longer payable.", "PAYMENT_ORDER_NOT_PENDING");
  }

  const metadata = purchase.metadata ? parsePurchaseMetadata(purchase.metadata) : {};
  if (!metadata.amountCents || !metadata.currency || !metadata.sku) {
    throw new AppError(500, "Payment order metadata is incomplete.", "PAYMENT_ORDER_INVALID");
  }

  return createLiqPayCheckoutForm({
    orderId,
    amountCents: metadata.amountCents,
    currency: metadata.currency,
    description: `Waves Arcade order ${metadata.sku}`
  });
}

export async function completeLiqPayPurchase(input: {
  data: string;
  signature: string;
}) {
  if (!env.LIQPAY_PRIVATE_KEY) {
    throw new AppError(503, "LiqPay is not configured.", "LIQPAY_NOT_CONFIGURED");
  }

  if (!verifyLiqPaySignature(input.data, input.signature, env.LIQPAY_PRIVATE_KEY)) {
    throw new AppError(401, "Invalid LiqPay signature.", "LIQPAY_SIGNATURE_INVALID");
  }

  const payload = decodeLiqPayData(input.data);
  const orderId = payload.order_id;
  if (!orderId) {
    throw new AppError(400, "Missing LiqPay order ID.", "LIQPAY_ORDER_ID_MISSING");
  }
  assertStrongIdempotencyKey(orderId);

  const purchase = await prisma.purchaseTransaction.findUnique({ where: { idempotencyKey: orderId } });
  if (!purchase) {
    return { status: "ignored", orderId, providerStatus: payload.status ?? "unknown" } as const;
  }

  const metadata = purchase.metadata ? parsePurchaseMetadata(purchase.metadata) : {};
  const paidAmountCents = typeof payload.amount === "string"
    ? Math.round(Number(payload.amount) * 100)
    : typeof payload.amount === "number"
      ? Math.round(payload.amount * 100)
      : null;

  if (
    metadata.amountCents !== undefined &&
    paidAmountCents !== null &&
    paidAmountCents !== metadata.amountCents
  ) {
    throw new AppError(409, "Paid amount does not match the order.", "PAYMENT_AMOUNT_MISMATCH");
  }

  if (metadata.currency && payload.currency && metadata.currency !== payload.currency) {
    throw new AppError(409, "Paid currency does not match the order.", "PAYMENT_CURRENCY_MISMATCH");
  }

  if (!purchaseStatusIsPaid(payload.status)) {
    if (purchase.status === "pending") {
      await prisma.purchaseTransaction.update({
        where: { id: purchase.id },
        data: {
          status: "failed",
          metadata: JSON.stringify({
            ...metadata,
            failedAt: new Date().toISOString(),
            providerStatus: payload.status ?? "unknown",
            errCode: payload.err_code ?? null,
            errDescription: payload.err_description ?? null
          })
        }
      });
    }
    return { status: "failed", orderId, providerStatus: payload.status ?? "unknown" } as const;
  }

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const claimed = await tx.purchaseTransaction.updateMany({
        where: { id: purchase.id, status: "pending" },
        data: { status: "processing" }
      });

      if (claimed.count !== 1) {
        const current = await tx.purchaseTransaction.findUniqueOrThrow({ where: { id: purchase.id } });
        if (current.status === "completed") {
          return { status: "already_processed" as const };
        }
        throw new AppError(409, "Payment order is already being processed.", "PAYMENT_ALREADY_PROCESSING");
      }

      await grantPaidPurchase(tx, purchase, metadata, payload.status ?? "success", payload);
      return { status: "completed" as const };
    });

    return { ...result, orderId, providerStatus: payload.status ?? "success" } as const;
  } catch (error) {
    rethrowSafeWalletMutationError(error);
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
  await assertNoActiveRestriction(userId, ["rewards_removed", "temporary_ban", "permanent_ban"], "Ad rewards");
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
  await assertNoActiveRestriction(userId, ["rewards_removed", "temporary_ban", "permanent_ban"], "Ad rewards");
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
      const providerPayload = sanitizeProviderPayload(input.providerPayload);
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
          providerPayload,
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
