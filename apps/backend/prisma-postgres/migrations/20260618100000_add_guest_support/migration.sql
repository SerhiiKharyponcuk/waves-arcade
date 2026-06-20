ALTER TABLE "SupportTicket" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "contactName" TEXT;

UPDATE "SupportTicket" AS ticket
SET
  "contactEmail" = account."email",
  "contactName" = profile."displayName"
FROM "User" AS account
LEFT JOIN "UserProfile" AS profile ON profile."userId" = account."id"
WHERE ticket."userId" = account."id";

ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_userId_fkey";
ALTER TABLE "SupportTicket" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
