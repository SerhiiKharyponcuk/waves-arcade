PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_SupportTicket" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT,
  "adminId" TEXT,
  "contactEmail" TEXT,
  "contactName" TEXT,
  "category" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "adminResponse" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "closedAt" DATETIME,
  CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SupportTicket_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_SupportTicket" (
  "id", "userId", "adminId", "contactEmail", "contactName", "category", "subject", "message", "status", "adminResponse", "createdAt", "updatedAt", "closedAt"
)
SELECT
  ticket."id",
  ticket."userId",
  ticket."adminId",
  account."email",
  profile."displayName",
  ticket."category",
  ticket."subject",
  ticket."message",
  ticket."status",
  ticket."adminResponse",
  ticket."createdAt",
  ticket."updatedAt",
  ticket."closedAt"
FROM "SupportTicket" AS ticket
LEFT JOIN "User" AS account ON account."id" = ticket."userId"
LEFT JOIN "UserProfile" AS profile ON profile."userId" = account."id";

DROP TABLE "SupportTicket";
ALTER TABLE "new_SupportTicket" RENAME TO "SupportTicket";

CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");
CREATE INDEX "SupportTicket_adminId_idx" ON "SupportTicket"("adminId");
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
