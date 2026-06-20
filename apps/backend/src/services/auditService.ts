import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

const blockedMetadataKeys = /password|hash|token|secret|credential/i;

function sanitizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) {
    return undefined;
  }

  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !blockedMetadataKeys.test(key)));
}

export async function writeAdminAuditLog(input: {
  adminId?: string | null;
  actionType: string;
  targetUserId?: string | null;
  targetEntityId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  return tx.adminAuditLog.create({
    data: {
      adminId: input.adminId,
      actionType: input.actionType,
      targetUserId: input.targetUserId,
      targetEntityId: input.targetEntityId,
      reason: input.reason,
      metadata: input.metadata ? JSON.stringify(sanitizeMetadata(input.metadata)) : undefined
    }
  });
}
