import { createHash } from "node:crypto";
import type { AdminActivityDayDto, AdminAnalyticsDto } from "@waves/shared";
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

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createActivityTimeline(now: Date): AdminActivityDayDto[] {
  const today = startOfUtcDay(now);
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today.getTime() - (13 - index) * 86_400_000);
    return {
      date: utcDayKey(date),
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      gameSessions: 0,
      validScores: 0,
      adViews: 0,
      newUsers: 0,
      guestSessions: 0,
      clientErrors: 0
    };
  });
}

function addToTimeline(
  timelineMap: Map<string, AdminActivityDayDto>,
  date: Date,
  key: keyof Pick<AdminActivityDayDto, "gameSessions" | "validScores" | "adViews" | "newUsers" | "guestSessions" | "clientErrors">
) {
  const row = timelineMap.get(utcDayKey(startOfUtcDay(date)));
  if (row) {
    row[key] += 1;
  }
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
  const timeline = createActivityTimeline(now);
  const timelineMap = new Map(timeline.map((row) => [row.date, row]));
  const timelineStart = new Date(`${timeline[0]!.date}T00:00:00.000Z`);
  const [
    registeredUsers,
    registeredLast7Days,
    activeRows,
    previousRows,
    gameSessions30Days,
    validScores30Days,
    completedAdViews30Days,
    guestRows,
    sessionRows,
    scoreRows,
    adRows,
    userRows,
    analyticsRows
  ] = await Promise.all([
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: "ACTIVE", createdAt: { gte: sevenDaysAgo } } }),
    prisma.gameSession.findMany({ where: { startedAt: { gte: sevenDaysAgo } }, select: { userId: true }, distinct: ["userId"] }),
    prisma.gameSession.findMany({ where: { startedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } }, select: { userId: true }, distinct: ["userId"] }),
    prisma.gameSession.count({ where: { startedAt: { gte: thirtyDaysAgo } } }),
    prisma.score.count({ where: { createdAt: { gte: thirtyDaysAgo }, status: "valid" } }),
    prisma.adReward.count({ where: { createdAt: { gte: thirtyDaysAgo }, status: "completed" } }),
    prisma.analyticsEvent.findMany({ where: { createdAt: { gte: thirtyDaysAgo }, eventType: "guest_session_start", guestIdHash: { not: null } }, select: { guestIdHash: true }, distinct: ["guestIdHash"] }),
    prisma.gameSession.findMany({ where: { startedAt: { gte: timelineStart } }, select: { startedAt: true } }),
    prisma.score.findMany({ where: { createdAt: { gte: timelineStart }, status: "valid" }, select: { createdAt: true } }),
    prisma.adReward.findMany({ where: { createdAt: { gte: timelineStart }, status: "completed" }, select: { createdAt: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: timelineStart }, status: "ACTIVE" }, select: { createdAt: true } }),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: timelineStart }, eventType: { in: ["guest_session_start", "client_error"] } },
      select: { createdAt: true, eventType: true }
    })
  ]);
  for (const row of sessionRows) addToTimeline(timelineMap, row.startedAt, "gameSessions");
  for (const row of scoreRows) addToTimeline(timelineMap, row.createdAt, "validScores");
  for (const row of adRows) addToTimeline(timelineMap, row.createdAt, "adViews");
  for (const row of userRows) addToTimeline(timelineMap, row.createdAt, "newUsers");
  for (const row of analyticsRows) addToTimeline(timelineMap, row.createdAt, row.eventType === "client_error" ? "clientErrors" : "guestSessions");
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
    activityTimeline: timeline,
    generatedAt: now.toISOString()
  };
}
