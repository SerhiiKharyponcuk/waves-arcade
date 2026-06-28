ALTER TABLE "PurchaseTransaction" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "PurchaseTransaction_idempotencyKey_key" ON "PurchaseTransaction"("idempotencyKey");
CREATE INDEX "PurchaseTransaction_type_idx" ON "PurchaseTransaction"("type");
CREATE INDEX "PurchaseTransaction_status_idx" ON "PurchaseTransaction"("status");

DROP INDEX IF EXISTS "GuestTransferAttempt_guestIdHash_idx";
CREATE UNIQUE INDEX "GuestTransferAttempt_guestIdHash_key" ON "GuestTransferAttempt"("guestIdHash");
