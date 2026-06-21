import { createHash } from "node:crypto";
import type { AdminAnalyticsDto } from "@waves/shared";
import { prisma } from "../config/prisma.js";

const allowedEvents = new Set([
  "app_open", "guest_session_start", "login_success", "registration_success", "game_start",
  "game_complete", "shop_view", "ad_view", "ad_reward_complete", "account_deleted", "client_error"
]);

function hashGuestId(guestId: string | undefined) {
  return guestId ? createHash("sha256").update(`waves-analytics:${guestId}`).digest("hex") : null;
}

function safeMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return null;
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata).slice(0, 12)) {
    if (/password|token|secret|email/i.test(key)) continue;
    if (typeof value === "string") safe[key] = value.slice(0, 120);
    else if (typeof value === "number" && Number.isFinite(value)) safe[key] = value;
    else if (typeof value === "boolean" || value === null) safe[key] = value;
  }
  return Object.keys(safe).length ? JSON.stringify(safe) : null;
}

export async function recordAnalyticsEvent(input: {
  userId?: string;
  guestId?: string;
  eventType: string;
  sessionKey?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!allowedEvents.has(input.eventType)) return { accepted: false };
  await prisma.analyticsEvent.create({
    data: {
      userId: input.userId,
      guestIdHash: input.userId ? null : hashGuestId(input.guestId),
      eventType: input.eventType,
      sessionKey: input.sessionKey?.slice(0, 100),
      metadata: safeMetadata(input.metadata)
    }
  });
  return { accepted: true };
}

export async function getAdminAnalytics(): Promise<AdminAnalyticsDto> {
  const now = new Date();
  const day = 86_400_000;
  const sevenDaysAgo = new Date(now.getTime() - 7 * day);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * day);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * day);
  const [registeredUsers, registeredLast7Days, activeRows, previousRows, gameSessions30Days, validScores30Days, completedAdViews30Days, guestRows] = await Promise.all([
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: "ACTIVE", createdAt: { gte: sevenDaysAgo } } }),
    prisma.gameSession.findMany({ where: { startedAt: { gte: sevenDaysAgo } }, select: { userId: true }, distinct: ["userId"] }),
    prisma.gameSession.findMany({ where: { startedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } }, select: { userId: true }, distinct: ["userId"] }),
    prisma.gameSession.count({ where: { startedAt: { gte: thirtyDaysAgo } } }),
    prisma.score.count({ where: { createdAt: { gte: thirtyDaysAgo }, status: "valid" } }),
    prisma.adReward.count({ where: { createdAt: { gte: thirtyDaysAgo }, status: "completed" } }),
    prisma.analyticsEvent.findMany({ where: { createdAt: { gte: thirtyDaysAgo }, eventType: "guest_session_start", guestIdHash: { not: null } }, select: { guestIdHash: true }, distinct: ["guestIdHash"] })
  ]);
  const previous = new Set(previousRows.map((row: { userId: string }) => row.userId));
  return {
    registeredUsers,
    registeredLast7Days,
    activePlayers7Days: activeRows.length,
    gameSessions30Days,
    validScores30Days,
    completedAdViews30Days,
    guestUsers30Days: guestRows.length,
    returningPlayers7Days: activeRows.filter((row: { userId: string }) => previous.has(row.userId)).length,
    generatedAt: now.toISOString()
  };
}
