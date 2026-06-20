ALTER TABLE "User"
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "passwordResetAt" TIMESTAMP(3),
  ADD COLUMN "temporaryPasswordUsed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastPasswordChangeAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "trustStatus" TEXT NOT NULL DEFAULT 'NORMAL';

ALTER TABLE "UserProfile"
  ADD COLUMN "selectedThemeId" TEXT NOT NULL DEFAULT 'classic-neon',
  ADD COLUMN "customizationJson" TEXT NOT NULL DEFAULT '{}',
  ADD COLUMN "gameSettingsJson" TEXT NOT NULL DEFAULT '{}',
  ADD COLUMN "showUsernameInLeaderboard" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "hideProfile" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Score"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'valid',
  ADD COLUMN "reviewReason" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT;

ALTER TABLE "Score" ADD CONSTRAINT "Score_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Score_status_idx" ON "Score"("status");

ALTER TABLE "GameSession" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'started';

ALTER TABLE "SupportTicket"
  ADD COLUMN "relatedEntityId" TEXT,
  ADD COLUMN "internalNote" TEXT,
  ADD COLUMN "appealStatus" TEXT;

CREATE TABLE "OwnedTheme" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "themeId" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'unlock',
  "ownedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OwnedTheme_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OwnedTheme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OwnedTheme_userId_themeId_key" ON "OwnedTheme"("userId", "themeId");
CREATE INDEX "OwnedTheme_userId_idx" ON "OwnedTheme"("userId");

CREATE TABLE "Restriction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "adminId" TEXT,
  "type" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Restriction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Restriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Restriction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Restriction_userId_active_idx" ON "Restriction"("userId", "active");
CREATE INDEX "Restriction_type_idx" ON "Restriction"("type");

CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "adminId" TEXT,
  "actionType" TEXT NOT NULL,
  "targetUserId" TEXT,
  "targetEntityId" TEXT,
  "reason" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AdminAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");
CREATE INDEX "AdminAuditLog_targetUserId_idx" ON "AdminAuditLog"("targetUserId");
CREATE INDEX "AdminAuditLog_actionType_idx" ON "AdminAuditLog"("actionType");
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

CREATE TABLE "GuestTransferAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "guestIdHash" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "bestScore" INTEGER NOT NULL DEFAULT 0,
  "transferredScore" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuestTransferAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GuestTransferAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "GuestTransferAttempt_userId_idx" ON "GuestTransferAttempt"("userId");
CREATE INDEX "GuestTransferAttempt_guestIdHash_idx" ON "GuestTransferAttempt"("guestIdHash");
CREATE INDEX "GuestTransferAttempt_status_idx" ON "GuestTransferAttempt"("status");
