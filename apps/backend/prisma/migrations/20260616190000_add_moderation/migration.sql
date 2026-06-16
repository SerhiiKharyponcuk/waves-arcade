ALTER TABLE "User" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "bannedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "bannedUntil" DATETIME;
ALTER TABLE "User" ADD COLUMN "banReason" TEXT;
ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" DATETIME;

CREATE TABLE "ModerationAction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "adminId" TEXT,
  "targetUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "message" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationAction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ModerationAction_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ModerationAction_adminId_idx" ON "ModerationAction"("adminId");
CREATE INDEX "ModerationAction_targetUserId_idx" ON "ModerationAction"("targetUserId");
CREATE INDEX "ModerationAction_action_idx" ON "ModerationAction"("action");
