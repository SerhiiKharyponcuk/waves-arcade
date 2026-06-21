import assert from "node:assert/strict";
import test from "node:test";
import type { AddressInfo } from "node:net";
import { createApp } from "./app.js";
import { prisma } from "./config/prisma.js";

async function request<T>(base: string, path: string, options: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { "content-type": "application/json", ...options.headers } });
  const body = await response.json() as T;
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  return body;
}

test("guest, registration, game, shop and admin API flows", async () => {
  const server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const email = `integration-${Date.now()}@waves.local`;
  const password = "Integration123!";

  try {
    const health = await request<{ status: string }>(base, "/health");
    assert.equal(health.status, "ok");

    const guestSkins = await request<Array<{ id: string }>>(base, "/shop/skins");
    assert.ok(guestSkins.length >= 2);

    const auth = await request<{ accessToken: string; user: { email: string } }>(base, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName: "Integration QA", locale: "en", termsAccepted: true, website: "", formStartedAt: Date.now() - 3_000 })
    });
    assert.equal(auth.user.email, email);
    const headers = { authorization: `Bearer ${auth.accessToken}` };

    const accountSkins = await request<Array<{ owned: boolean }>>(base, "/shop/skins", { headers });
    assert.ok(accountSkins.some((skin) => skin.owned));

    const session = await request<{ sessionId: string }>(base, "/game/session/start", { method: "POST", headers, body: "{}" });
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    const checkpoint = await request<{ accepted: boolean }>(base, "/game/session/checkpoint", {
      method: "POST", headers,
      body: JSON.stringify({ sessionId: session.sessionId, sequence: 1, elapsedMs: 1_000, distance: 220, coinsCollected: 0, inputTransitions: 2 })
    });
    assert.equal(checkpoint.accepted, true);
    const gameResult = await request<{ accepted: boolean; status: string }>(base, "/game/session/end", {
      method: "POST", headers,
      body: JSON.stringify({ sessionId: session.sessionId, score: 260, coinsCollected: 0, distance: 260, durationMs: 1_250, obstacleHits: 1, clientChecksum: "" })
    });
    assert.equal(gameResult.accepted, true);
    assert.equal(gameResult.status, "valid");
    const leaderboard = await request<{ global: unknown[] }>(base, "/game/leaderboard", { headers });
    assert.ok(leaderboard.global.length >= 1);

    await prisma.user.update({ where: { email: "test@waves.local" }, data: { role: "ADMIN" } });
    const adminAuth = await request<{ accessToken: string }>(base, "/auth/login", { method: "POST", body: JSON.stringify({ email: "test@waves.local", password: "Test1234!" }) });
    const analytics = await request<{ registeredUsers: number }>(base, "/admin/analytics", { headers: { authorization: `Bearer ${adminAuth.accessToken}` } });
    assert.ok(analytics.registeredUsers >= 1);
  } finally {
    await prisma.user.updateMany({ where: { email: "test@waves.local" }, data: { role: "PLAYER" } });
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  }
});
