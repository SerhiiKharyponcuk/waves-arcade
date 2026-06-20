ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "passwordResetAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "temporaryPasswordUsed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "lastPasswordChangeAt" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
ALTER TABLE "User" ADD COLUMN "trustStatus" TEXT NOT NULL DEFAULT 'NORMAL';

ALTER TABLE "UserProfile" ADD COLUMN "selectedThemeId" TEXT NOT NULL DEFAULT 'classic-neon';
ALTER TABLE "UserProfile" ADD COLUMN "customizationJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "UserProfile" ADD COLUMN "gameSettingsJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "UserProfile" ADD COLUMN "showUsernameInLeaderboard" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserProfile" ADD COLUMN "hideProfile" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Score" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'valid';
ALTER TABLE "Score" ADD COLUMN "reviewReason" TEXT;
ALTER TABLE "Score" ADD COLUMN "reviewedAt" DATETIME;
ALTER TABLE "Score" ADD COLUMN "reviewedById" TEXT;
CREATE INDEX "Score_status_idx" ON "Score"("status");

ALTER TABLE "GameSession" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'started';
ALTER TABLE "SupportTicket" ADD COLUMN "relatedEntityId" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "internalNote" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "appealStatus" TEXT;

CREATE TABLE "OwnedTheme" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "themeId" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'unlock',
  "ownedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OwnedTheme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OwnedTheme_userId_themeId_key" ON "OwnedTheme"("userId", "themeId");
CREATE INDEX "OwnedTheme_userId_idx" ON "OwnedTheme"("userId");

CREATE TABLE "Restriction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "adminId" TEXT,
  "type" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" DATETIME,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Restriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Restriction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Restriction_userId_active_idx" ON "Restriction"("userId", "active");
CREATE INDEX "Restriction_type_idx" ON "Restriction"("type");

CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "adminId" TEXT,
  "actionType" TEXT NOT NULL,
  "targetUserId" TEXT,
  "targetEntityId" TEXT,
  "reason" TEXT,
  "metadata" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AdminAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");
CREATE INDEX "AdminAuditLog_targetUserId_idx" ON "AdminAuditLog"("targetUserId");
CREATE INDEX "AdminAuditLog_actionType_idx" ON "AdminAuditLog"("actionType");
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

CREATE TABLE "GuestTransferAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "guestIdHash" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "bestScore" INTEGER NOT NULL DEFAULT 0,
  "transferredScore" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT,
  "metadata" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuestTransferAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "GuestTransferAttempt_userId_idx" ON "GuestTransferAttempt"("userId");
CREATE INDEX "GuestTransferAttempt_guestIdHash_idx" ON "GuestTransferAttempt"("guestIdHash");
CREATE INDEX "GuestTransferAttempt_status_idx" ON "GuestTransferAttempt"("status");
