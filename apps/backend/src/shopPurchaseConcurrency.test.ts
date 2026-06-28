import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { AddressInfo } from "node:net";
import type { Request, Response } from "express";
import { createApp } from "./app.js";
import { prisma } from "./config/prisma.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { signLiqPayData } from "./services/liqpayProvider.js";

type ApiResponse<T> = {
  status: number;
  ok: boolean;
  body: T;
};

async function request<T>(base: string, path: string, options: RequestInit = {}) {
  const response = await rawRequest<T>(base, path, options);
  if (!response.ok) {
    throw new Error(`${response.status}: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

async function rawRequest<T>(base: string, path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...options.headers }
  });
  const body = await response.json().catch(() => ({})) as T;
  return { status: response.status, ok: response.ok, body };
}

async function registerTestAccount(base: string, displayName: string) {
  const email = `${displayName.toLowerCase().replaceAll(" ", "-")}-${Date.now()}-${Math.random().toString(16).slice(2)}@waves.local`;
  const auth = await request<{ accessToken: string; user: { id: string } }>(base, "/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password: "RaceTest123!",
      displayName,
      locale: "en",
      termsAccepted: true,
      website: "",
      formStartedAt: Date.now() - 3_000
    })
  });
  return {
    email,
    accessToken: auth.accessToken,
    userId: auth.user.id,
    headers: { authorization: `Bearer ${auth.accessToken}` }
  };
}

test("parallel skin purchases are atomic and charge the wallet only once", async () => {
  const server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const email = `race-${Date.now()}-${Math.random().toString(16).slice(2)}@waves.local`;
  const password = "RaceTest123!";
  const skinId = randomUUID();
  const slug = `race-skin-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const priceCoins = 100;
  let userId = "";

  try {
    const skin = await prisma.skin.create({
      data: {
        id: skinId,
        slug,
        nameKey: "skins.raceTest.name",
        descriptionKey: "skins.raceTest.description",
        category: "trail",
        rarity: "rare",
        priceCoins,
        priceGems: 0,
        active: true,
        visualJson: JSON.stringify({ primaryColor: "#38bdf8" })
      }
    });

    const auth = await request<{ accessToken: string; user: { id: string } }>(base, "/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        displayName: "Race Pilot",
        locale: "en",
        termsAccepted: true,
        website: "",
        formStartedAt: Date.now() - 3_000
      })
    });
    userId = auth.user.id;
    await prisma.wallet.update({ where: { userId }, data: { coins: 500, gems: 0, lifetimeCoins: 500 } });

    const headers = { authorization: `Bearer ${auth.accessToken}` };
    const responses = await Promise.all(
      Array.from({ length: 20 }, () =>
        rawRequest<{ code?: string }>(base, "/shop/buy-skin", {
          method: "POST",
          headers,
          body: JSON.stringify({ skinId: skin.id })
        })
      )
    );

    const successful = responses.filter((response) => response.status === 201);
    const safeFailures = responses.filter(
      (response) =>
        response.status === 409 &&
        (response.body.code === "SKIN_ALREADY_OWNED" || response.body.code === "PURCHASE_CONFLICT")
    );
    assert.equal(successful.length, 1);
    assert.equal(safeFailures.length, 19);
    assert.equal(responses.some((response) => response.status >= 500), false);

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    assert.equal(wallet.coins, 500 - priceCoins);

    const ownedCount = await prisma.ownedSkin.count({ where: { userId, skinId: skin.id } });
    assert.equal(ownedCount, 1);

    const purchaseCount = await prisma.purchaseTransaction.count({
      where: { userId, skinId: skin.id, provider: "wallet", type: "skin", status: "completed" }
    });
    assert.equal(purchaseCount, 1);

    const walletTransactionCount = await prisma.walletTransaction.count({
      where: { userId, type: "SHOP_PURCHASE", provider: "wallet", amountCoins: -priceCoins }
    });
    assert.equal(walletTransactionCount, 1);

    const health = await request<{ status: string }>(base, "/health");
    assert.equal(health.status, "ok");
  } finally {
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    } else {
      await prisma.user.deleteMany({ where: { email } });
    }
    await prisma.skin.deleteMany({ where: { id: skinId } });
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("parallel rewards and guest transfers are atomic", async () => {
  const server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const userIds: string[] = [];
  const originalRandom = Math.random;

  try {
    const dailyUser = await registerTestAccount(base, "Daily Pilot");
    userIds.push(dailyUser.userId);
    await prisma.wallet.update({ where: { userId: dailyUser.userId }, data: { coins: 0, gems: 0, rouletteTickets: 0, extraLives: 0, lifetimeCoins: 0 } });
    const dailyResponses = await Promise.all(
      Array.from({ length: 10 }, () =>
        rawRequest<{ code?: string }>(base, "/wallet/reward", {
          method: "POST",
          headers: dailyUser.headers
        })
      )
    );
    assert.equal(dailyResponses.filter((response) => response.status === 201).length, 1);
    assert.equal(dailyResponses.some((response) => response.status >= 500), false);
    assert.equal(dailyResponses.filter((response) => response.status === 409).length, 9);
    const dailyWallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: dailyUser.userId } });
    assert.equal(dailyWallet.coins, 120);
    assert.equal(await prisma.purchaseTransaction.count({ where: { userId: dailyUser.userId, type: "daily_reward", status: "completed" } }), 1);

    const adUser = await registerTestAccount(base, "Ad Pilot");
    userIds.push(adUser.userId);
    await prisma.wallet.update({ where: { userId: adUser.userId }, data: { coins: 0, gems: 0, rouletteTickets: 0, extraLives: 0, lifetimeCoins: 0 } });
    const adSession = await request<{ adSessionId: string }>(base, "/wallet/ad/reward/start", {
      method: "POST",
      headers: adUser.headers,
      body: JSON.stringify({ placement: "coins", provider: "mock" })
    });
    const adResponses = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        rawRequest<{ code?: string }>(base, "/wallet/ad/reward/complete", {
          method: "POST",
          headers: adUser.headers,
          body: JSON.stringify({ adSessionId: adSession.adSessionId, provider: "mock", providerEventId: `parallel-${index}` })
        })
      )
    );
    assert.equal(adResponses.filter((response) => response.status === 201).length, 1);
    assert.equal(adResponses.some((response) => response.status >= 500), false);
    assert.equal(adResponses.filter((response) => response.status === 409).length, 9);
    const adWallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: adUser.userId } });
    assert.equal(adWallet.coins, 120);
    assert.equal(await prisma.walletTransaction.count({ where: { userId: adUser.userId, type: "AD_REWARD" } }), 1);

    const rouletteUser = await registerTestAccount(base, "Roulette Pilot");
    userIds.push(rouletteUser.userId);
    await prisma.wallet.update({ where: { userId: rouletteUser.userId }, data: { coins: 0, gems: 0, rouletteTickets: 0, extraLives: 0, lifetimeCoins: 0 } });
    Math.random = () => 0.01;
    const rouletteResponses = await Promise.all(
      Array.from({ length: 8 }, () =>
        rawRequest<{ code?: string }>(base, "/wallet/roulette/spin", {
          method: "POST",
          headers: rouletteUser.headers,
          body: JSON.stringify({ adsWatched: 0 })
        })
      )
    );
    assert.equal(rouletteResponses.filter((response) => response.status === 201).length, 1);
    assert.equal(rouletteResponses.some((response) => response.status >= 500), false);
    assert.equal(rouletteResponses.filter((response) => response.status === 400 || response.status === 409).length, 7);
    const rouletteWallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: rouletteUser.userId } });
    assert.equal(rouletteWallet.coins, 250);
    assert.equal(await prisma.rouletteSpin.count({ where: { userId: rouletteUser.userId } }), 1);

    const transferUser = await registerTestAccount(base, "Transfer Pilot");
    userIds.push(transferUser.userId);
    const guestId = `guest-${randomUUID()}`;
    const transferPayload = {
      guestId,
      gamesPlayed: 3,
      bestGuestScore: 1400,
      selectedBasicTheme: "classic-neon",
      selectedBasicSkin: "basic-arrow",
      selectedBasicControls: { movementType: "click", sensitivity: 1 },
      temporarySettings: { muted: false, vibration: true },
      temporaryCoins: 9999
    };
    const transferResponses = await Promise.all(
      Array.from({ length: 10 }, () =>
        rawRequest<{ code?: string }>(base, "/auth/guest-transfer", {
          method: "POST",
          headers: transferUser.headers,
          body: JSON.stringify(transferPayload)
        })
      )
    );
    assert.equal(transferResponses.filter((response) => response.status === 200).length, 1);
    assert.equal(transferResponses.some((response) => response.status >= 500), false);
    assert.equal(transferResponses.filter((response) => response.status === 409).length, 9);
    assert.equal(await prisma.guestTransferAttempt.count({ where: { userId: transferUser.userId } }), 1);
    const profile = await prisma.userProfile.findUniqueOrThrow({ where: { userId: transferUser.userId } });
    assert.equal(profile.highScore, 1400);
  } finally {
    Math.random = originalRandom;
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("payment placeholder validates server-side pricing and idempotency payloads", async () => {
  const server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  let userId = "";

  try {
    const user = await registerTestAccount(base, "Payment Pilot");
    userId = user.userId;

    const tampered = await rawRequest<{ code?: string }>(base, "/wallet/purchase-placeholder", {
      method: "POST",
      headers: user.headers,
      body: JSON.stringify({
        sku: "coins_1000",
        amountCents: 1,
        supportAmountCents: 0,
        currency: "UAH",
        provider: "liqpay",
        idempotencyKey: `payment-tamper-${randomUUID()}`
      })
    });
    assert.equal(tampered.status, 400);
    assert.equal(tampered.body.code, "PAYMENT_AMOUNT_MISMATCH");

    const idempotencyKey = `payment-valid-${randomUUID()}`;
    const valid = await rawRequest<{ status: string }>(base, "/wallet/purchase-placeholder", {
      method: "POST",
      headers: user.headers,
      body: JSON.stringify({
        sku: "coins_1000",
        amountCents: 14_900,
        supportAmountCents: 5_000,
        currency: "UAH",
        provider: "liqpay",
        idempotencyKey
      })
    });
    assert.equal(valid.status, 202);

    const transaction = await prisma.purchaseTransaction.findUniqueOrThrow({ where: { idempotencyKey } });
    const metadata = JSON.parse(transaction.metadata ?? "{}") as {
      amountCents: number;
      productAmountCents: number;
      supportAmountCents: number;
      currency: string;
      grants: { coins: number; premiumDays: number; skinSlug: string | null };
    };
    assert.equal(transaction.type, "coins");
    assert.equal(metadata.amountCents, 14_900);
    assert.equal(metadata.productAmountCents, 9_900);
    assert.equal(metadata.supportAmountCents, 5_000);
    assert.equal(metadata.currency, "UAH");
    assert.equal(metadata.grants.coins, 1_000);

    const conflict = await rawRequest<{ code?: string }>(base, "/wallet/purchase-placeholder", {
      method: "POST",
      headers: user.headers,
      body: JSON.stringify({
        sku: "coins_1000",
        amountCents: 10_900,
        supportAmountCents: 1_000,
        currency: "UAH",
        provider: "liqpay",
        idempotencyKey
      })
    });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.code, "IDEMPOTENCY_KEY_CONFLICT");
  } finally {
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("server-side anti-cheat restriction blocks gameplay after suspicious checkpoints", async () => {
  const server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  let userId = "";

  try {
    const user = await registerTestAccount(base, "Guard Pilot");
    userId = user.userId;
    const session = await request<{ sessionId: string }>(base, "/game/session/start", {
      method: "POST",
      headers: user.headers
    });

    const rejected = await rawRequest<{ code?: string }>(base, "/game/session/checkpoint", {
      method: "POST",
      headers: user.headers,
      body: JSON.stringify({
        sessionId: session.sessionId,
        sequence: 1,
        elapsedMs: 1_000,
        distance: 1_000_000,
        coinsCollected: 0,
        inputTransitions: 1
      })
    });
    assert.equal(rejected.status, 422);
    assert.equal(rejected.body.code, "CHECKPOINT_REJECTED");

    const restriction = await prisma.restriction.findFirstOrThrow({
      where: { userId: user.userId, active: true, type: "temporary_ban" }
    });
    assert.ok(restriction.endsAt);
    assert.ok(restriction.endsAt.getTime() > Date.now() + 23 * 60 * 60_000);

    const blocked = await rawRequest<{ code?: string }>(base, "/game/session/start", {
      method: "POST",
      headers: user.headers
    });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.code, "FEATURE_RESTRICTED");
  } finally {
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("liqpay sandbox webhook completes a paid order only once", async () => {
  const server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const originalEnv = {
    PAYMENT_PROVIDER: env.PAYMENT_PROVIDER,
    LIQPAY_MODE: env.LIQPAY_MODE,
    LIQPAY_PUBLIC_KEY: env.LIQPAY_PUBLIC_KEY,
    LIQPAY_PRIVATE_KEY: env.LIQPAY_PRIVATE_KEY,
    LIQPAY_RESULT_URL: env.LIQPAY_RESULT_URL,
    LIQPAY_SERVER_URL: env.LIQPAY_SERVER_URL
  };
  let userId = "";

  try {
    env.PAYMENT_PROVIDER = "liqpay";
    env.LIQPAY_MODE = "sandbox";
    env.LIQPAY_PUBLIC_KEY = "sandbox_test_public";
    env.LIQPAY_PRIVATE_KEY = "sandbox_test_private";
    env.LIQPAY_RESULT_URL = "https://waves-arcade.vercel.app/payment?status=success";
    env.LIQPAY_SERVER_URL = `${base}/payments/liqpay/webhook`;

    const user = await registerTestAccount(base, "LiqPay Pilot");
    userId = user.userId;

    const idempotencyKey = `liqpay-${randomUUID()}`;
    const intent = await rawRequest<{ status: string; checkoutUrl?: string; externalId: string }>(base, "/wallet/purchase-placeholder", {
      method: "POST",
      headers: user.headers,
      body: JSON.stringify({
        sku: "coins_1000",
        supportAmountCents: 0,
        currency: "UAH",
        provider: "liqpay",
        idempotencyKey
      })
    });
    assert.equal(intent.status, 202);
    assert.equal(intent.body.status, "pending");
    assert.ok(intent.body.checkoutUrl?.includes(`/api/payments/liqpay/checkout/${idempotencyKey}`));

    const callbackPayload = {
      order_id: idempotencyKey,
      status: "sandbox",
      amount: "99.00",
      currency: "UAH",
      transaction_id: 10101
    };
    const data = Buffer.from(JSON.stringify(callbackPayload)).toString("base64");
    const signature = signLiqPayData(data, env.LIQPAY_PRIVATE_KEY);

    const callback = await rawRequest<{ status: string }>(base, "/payments/liqpay/webhook", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data, signature }).toString()
    });
    assert.equal(callback.status, 200);
    assert.equal(callback.body.status, "completed");

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    assert.equal(wallet.coins, 1_250);

    const transaction = await prisma.purchaseTransaction.findUniqueOrThrow({ where: { idempotencyKey } });
    assert.equal(transaction.status, "completed");
    assert.equal(transaction.amountCoins, 1_000);

    const repeatedCallback = await rawRequest<{ status: string }>(base, "/payments/liqpay/webhook", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data, signature }).toString()
    });
    assert.equal(repeatedCallback.status, 200);
    assert.equal(repeatedCallback.body.status, "already_processed");

    const finalWallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    assert.equal(finalWallet.coins, 1_250);
  } finally {
    env.PAYMENT_PROVIDER = originalEnv.PAYMENT_PROVIDER;
    env.LIQPAY_MODE = originalEnv.LIQPAY_MODE;
    env.LIQPAY_PUBLIC_KEY = originalEnv.LIQPAY_PUBLIC_KEY;
    env.LIQPAY_PRIVATE_KEY = originalEnv.LIQPAY_PRIVATE_KEY;
    env.LIQPAY_RESULT_URL = originalEnv.LIQPAY_RESULT_URL;
    env.LIQPAY_SERVER_URL = originalEnv.LIQPAY_SERVER_URL;
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("unexpected server errors are logged and returned without stack traces", () => {
  const logs: string[] = [];
  const originalConsoleError = console.error;
  console.error = (value?: unknown) => {
    logs.push(String(value));
  };

  const responseState = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    }
  };

  try {
    errorHandler(
      new Error("synthetic purchase failure"),
      {
        method: "POST",
        path: "/api/shop/buy-skin",
        header(name: string) {
          return name === "x-request-id" ? "test-request-id" : undefined;
        }
      } as Request,
      responseState as unknown as Response,
      () => undefined
    );

    assert.equal(responseState.statusCode, 500);
    assert.deepEqual(responseState.body, {
      message: "Error: synthetic purchase failure",
      code: "INTERNAL_SERVER_ERROR"
    });
    assert.equal(JSON.stringify(responseState.body).includes("stack"), false);
    assert.ok(logs.some((entry) => entry.includes("synthetic purchase failure")));
    assert.ok(logs.some((entry) => entry.includes("/api/shop/buy-skin")));
  } finally {
    console.error = originalConsoleError;
  }
});
