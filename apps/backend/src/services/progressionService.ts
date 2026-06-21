import type { ProgressionDto } from "@waves/shared";
import { prisma } from "../config/prisma.js";

const achievements = [
  { id: "first-flight", title: "First Flight", description: "Finish one valid run", target: 1 },
  { id: "neon-sprinter", title: "Neon Sprinter", description: "Reach 10,000 score", target: 10_000 },
  { id: "arena-master", title: "Arena Master", description: "Reach 50,000 score", target: 50_000 }
] as const;

const missions = [
  { id: "daily-runs", title: "Finish 3 valid runs", target: 3, rewardCoins: 75 },
  { id: "daily-score", title: "Score 10,000 points", target: 10_000, rewardCoins: 100 },
  { id: "daily-coins", title: "Collect 10 energy coins", target: 10, rewardCoins: 60 }
] as const;

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function recordProgressForValidRun(userId: string, score: number, coins: number) {
  const now = new Date();
  const key = dayKey(now);
  const currentAchievements = [Math.min(1, score > 0 ? 1 : 0), Math.min(10_000, score), Math.min(50_000, score)];

  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < achievements.length; index += 1) {
      const definition = achievements[index]!;
      const existing = await tx.achievementProgress.findUnique({ where: { userId_achievementId: { userId, achievementId: definition.id } } });
      const progress = Math.max(existing?.progress ?? 0, currentAchievements[index] ?? 0);
      await tx.achievementProgress.upsert({
        where: { userId_achievementId: { userId, achievementId: definition.id } },
        create: { userId, achievementId: definition.id, progress, unlockedAt: progress >= definition.target ? now : null },
        update: { progress, unlockedAt: existing?.unlockedAt ?? (progress >= definition.target ? now : null) }
      });
    }

    const increments = [1, score, coins];
    for (let index = 0; index < missions.length; index += 1) {
      const mission = missions[index]!;
      const row = await tx.dailyMissionProgress.upsert({
        where: { userId_missionId_dayKey: { userId, missionId: mission.id, dayKey: key } },
        create: { userId, missionId: mission.id, dayKey: key, target: mission.target, progress: Math.min(mission.target, increments[index] ?? 0) },
        update: { progress: { increment: increments[index] ?? 0 } }
      });
      if (!row.completedAt && row.progress >= mission.target) {
        await tx.dailyMissionProgress.update({ where: { id: row.id }, data: { progress: mission.target, completedAt: now } });
      }
    }

    const earnedXp = Math.max(10, Math.min(500, Math.floor(score / 100)));
    const season = await tx.seasonProgress.upsert({
      where: { userId },
      create: { userId, seasonId: "season-1", xp: earnedXp, level: 1 },
      update: { xp: { increment: earnedXp } }
    });
    await tx.seasonProgress.update({ where: { userId }, data: { level: Math.floor(season.xp / 1_000) + 1 } });
  });
}

export async function getProgression(userId: string): Promise<ProgressionDto> {
  const key = dayKey();
  const [achievementRows, missionRows, season] = await Promise.all([
    prisma.achievementProgress.findMany({ where: { userId } }),
    prisma.dailyMissionProgress.findMany({ where: { userId, dayKey: key } }),
    prisma.seasonProgress.upsert({ where: { userId }, create: { userId, seasonId: "season-1" }, update: {} })
  ]);
  const achievementMap = new Map(achievementRows.map((row) => [row.achievementId, row]));
  const missionMap = new Map(missionRows.map((row) => [row.missionId, row]));
  return {
    achievements: achievements.map((definition) => {
      const row = achievementMap.get(definition.id);
      return { ...definition, progress: Math.min(definition.target, row?.progress ?? 0), unlocked: Boolean(row?.unlockedAt), unlockedAt: row?.unlockedAt?.toISOString() ?? null };
    }),
    dailyMissions: missions.map((definition) => {
      const row = missionMap.get(definition.id);
      return { ...definition, progress: Math.min(definition.target, row?.progress ?? 0), completed: Boolean(row?.completedAt) };
    }),
    season: { seasonId: season.seasonId, name: "Neon Origins", xp: season.xp, level: season.level, xpForNextLevel: season.level * 1_000, premium: season.premium }
  };
}
