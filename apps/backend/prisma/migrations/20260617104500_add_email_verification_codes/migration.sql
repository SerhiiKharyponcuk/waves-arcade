ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" DATETIME;
UPDATE "User" SET "emailVerifiedAt" = CURRENT_TIMESTAMP;

CREATE TABLE "EmailVerificationCode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "usedAt" DATETIME,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailVerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "EmailVerificationCode_userId_idx" ON "EmailVerificationCode"("userId");
CREATE INDEX "EmailVerificationCode_expiresAt_idx" ON "EmailVerificationCode"("expiresAt");
