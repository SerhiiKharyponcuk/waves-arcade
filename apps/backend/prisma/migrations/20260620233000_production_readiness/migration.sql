ALTER TABLE "GameSession" ADD COLUMN "checkpointCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GameSession" ADD COLUMN "lastCheckpointAt" DATETIME;
ALTER TABLE "GameSession" ADD COLUMN "lastCheckpointElapsedMs" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GameSession" ADD COLUMN "checkpointDistance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GameSession" ADD COLUMN "checkpointCoins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GameSession" ADD COLUMN "checkpointTransitions" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "AnalyticsEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT,
  "guestIdHash" TEXT,
  "eventType" TEXT NOT NULL,
  "sessionKey" TEXT,
  "metadata" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AchievementProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "achievementId" TEXT NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "unlockedAt" DATETIME,
  "claimedAt" DATETIME,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "AchievementProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "DailyMissionProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "dayKey" TEXT NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "target" INTEGER NOT NULL,
  "completedAt" DATETIME,
  "claimedAt" DATETIME,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "DailyMissionProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SeasonProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 1,
  "premium" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "SeasonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AnalyticsEvent_eventType_createdAt_idx" ON "AnalyticsEvent"("eventType", "createdAt");
CREATE INDEX "AnalyticsEvent_userId_createdAt_idx" ON "AnalyticsEvent"("userId", "createdAt");
CREATE INDEX "AnalyticsEvent_guestIdHash_createdAt_idx" ON "AnalyticsEvent"("guestIdHash", "createdAt");
CREATE UNIQUE INDEX "AchievementProgress_userId_achievementId_key" ON "AchievementProgress"("userId", "achievementId");
CREATE INDEX "AchievementProgress_userId_idx" ON "AchievementProgress"("userId");
CREATE UNIQUE INDEX "DailyMissionProgress_userId_missionId_dayKey_key" ON "DailyMissionProgress"("userId", "missionId", "dayKey");
CREATE INDEX "DailyMissionProgress_userId_dayKey_idx" ON "DailyMissionProgress"("userId", "dayKey");
CREATE UNIQUE INDEX "SeasonProgress_userId_key" ON "SeasonProgress"("userId");
