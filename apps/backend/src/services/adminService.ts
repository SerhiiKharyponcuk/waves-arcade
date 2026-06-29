import bcrypt from "bcryptjs";
import type { AdminAuditLogDto, AdminEmailVerificationDto, AdminPasswordResetDto, AdminUserDto, FinancialTransactionDto, ModerationActionDto, RestrictionDto, RestrictionType, ScoreReviewDto, ScoreStatus } from "@waves/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { issueEmailVerificationCode } from "./authService.js";
import { writeAdminAuditLog } from "./auditService.js";
import { generateTemporaryPassword } from "./passwordService.js";
import { getSafeStoredDisplayName } from "../utils/displayName.js";

type AdminUserRow = Awaited<ReturnType<typeof getAdminUserOrThrow>>;

function toModerationActionDto(action: AdminUserRow["receivedActions"][number]): ModerationActionDto {
  return {
    id: action.id,
    action: action.action as ModerationActionDto["action"],
    reason: action.reason,
    message: action.message,
    createdAt: action.createdAt.toISOString(),
    adminEmail: action.admin?.email ?? null
  };
}

function toAdminUserDto(user: AdminUserRow): AdminUserDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role as AdminUserDto["role"],
    status: user.status as AdminUserDto["status"],
    displayName: user.profile ? getSafeStoredDisplayName(user.profile.displayName, user.id) : `User-${user.id.slice(0, 6)}`,
    highScore: user.profile?.highScore ?? 0,
    coins: user.wallet?.coins ?? 0,
    createdAt: user.createdAt.toISOString(),
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    bannedAt: user.bannedAt?.toISOString() ?? null,
    banReason: user.banReason,
    lastAction: user.receivedActions[0] ? toModerationActionDto(user.receivedActions[0]) : null,
    mustChangePassword: user.mustChangePassword,
    lastPasswordChangeAt: user.lastPasswordChangeAt.toISOString(),
    trustStatus: user.trustStatus as AdminUserDto["trustStatus"],
    activeRestrictions: user.restrictions.map(toRestrictionDto)
  };
}

function toRestrictionDto(restriction: AdminUserRow["restrictions"][number]): RestrictionDto {
  return {
    id: restriction.id,
    userId: restriction.userId,
    type: restriction.type as RestrictionType,
    reason: restriction.reason,
    notes: restriction.notes,
    startsAt: restriction.startsAt.toISOString(),
    endsAt: restriction.endsAt?.toISOString() ?? null,
    active: restriction.active,
    appealPossible: true
  };
}

function parseMetadata(metadata?: string | null): Record<string, unknown> | null {
  if (!metadata) {
    return null;
  }
  try {
    const parsed = JSON.parse(metadata) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

async function getAdminUserOrThrow(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      wallet: true,
      restrictions: { where: { active: true }, orderBy: { createdAt: "desc" } },
      receivedActions: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { admin: { select: { email: true } } }
      }
    }
  });

  if (!user) {
    throw new AppError(404, "User not found.", "USER_NOT_FOUND");
  }

  return user;
}

export async function listAdminUsers(query = ""): Promise<AdminUserDto[]> {
  const q = query.trim();
  const users = await prisma.user.findMany({
    take: 60,
    where: q
      ? {
          OR: [
            { email: { contains: q } },
            { profile: { displayName: { contains: q } } }
          ]
        }
      : undefined,
    orderBy: [{ status: "desc" }, { createdAt: "desc" }],
    include: {
      profile: true,
      wallet: true,
      restrictions: { where: { active: true }, orderBy: { createdAt: "desc" } },
      receivedActions: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { admin: { select: { email: true } } }
      }
    }
  });

  return users.map(toAdminUserDto);
}

export async function banUser(adminId: string, targetUserId: string, reason: string): Promise<AdminUserDto> {
  if (adminId === targetUserId) {
    throw new AppError(400, "Admins cannot ban their own account.", "SELF_BAN_BLOCKED");
  }

  const cleanReason = reason.trim() || "Terms of use violation.";

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: {
        status: "BANNED",
        bannedAt: new Date(),
        banReason: cleanReason
      }
    });

    await tx.moderationAction.create({
      data: {
        adminId,
        targetUserId,
        action: "BAN",
        reason: cleanReason,
        message: cleanReason
      }
    });
    await tx.restriction.create({
      data: { userId: targetUserId, adminId, type: "permanent_ban", reason: cleanReason }
    });
    await writeAdminAuditLog({ adminId, actionType: "ban_user", targetUserId, reason: cleanReason }, tx);
  });

  return toAdminUserDto(await getAdminUserOrThrow(targetUserId));
}

export async function unbanUser(adminId: string, targetUserId: string, reason: string): Promise<AdminUserDto> {
  const cleanReason = reason.trim() || "Ban lifted by admin.";

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: {
        status: "ACTIVE",
        bannedAt: null,
        bannedUntil: null,
        banReason: null
      }
    });

    await tx.moderationAction.create({
      data: {
        adminId,
        targetUserId,
        action: "UNBAN",
        reason: cleanReason,
        message: cleanReason
      }
    });
    await tx.restriction.updateMany({
      where: { userId: targetUserId, active: true, type: { in: ["temporary_ban", "permanent_ban"] } },
      data: { active: false }
    });
    await writeAdminAuditLog({ adminId, actionType: "unban_user", targetUserId, reason: cleanReason }, tx);
  });

  return toAdminUserDto(await getAdminUserOrThrow(targetUserId));
}

export async function thankUser(adminId: string, targetUserId: string, message: string): Promise<ModerationActionDto> {
  const cleanMessage = message.trim() || "Thank you for helping improve Waves Arcade.";
  const action = await prisma.moderationAction.create({
    data: {
      adminId,
      targetUserId,
      action: "THANK",
      message: cleanMessage
    },
    include: { admin: { select: { email: true } } }
  });

  return {
    id: action.id,
    action: action.action as ModerationActionDto["action"],
    reason: action.reason,
    message: action.message,
    createdAt: action.createdAt.toISOString(),
    adminEmail: action.admin?.email ?? null
  };
}

export async function resendUserEmailVerification(targetUserId: string): Promise<AdminEmailVerificationDto> {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) {
    throw new AppError(404, "User not found.", "USER_NOT_FOUND");
  }
  if (user.emailVerifiedAt) {
    return { user: toAdminUserDto(await getAdminUserOrThrow(user.id)), emailSent: false };
  }

  const result = await issueEmailVerificationCode(user.id, user.email);
  return {
    user: toAdminUserDto(await getAdminUserOrThrow(user.id)),
    emailSent: result.emailSent
  };
}

export async function manuallyVerifyUserEmail(adminId: string, targetUserId: string): Promise<AdminUserDto> {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) {
    throw new AppError(404, "User not found.", "USER_NOT_FOUND");
  }
  if (user.emailVerifiedAt) {
    return toAdminUserDto(await getAdminUserOrThrow(user.id));
  }

  const verifiedAt = new Date();
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: { emailVerifiedAt: verifiedAt }
    });
    await tx.emailVerificationCode.updateMany({
      where: { userId: targetUserId, usedAt: null },
      data: { usedAt: verifiedAt }
    });
    await tx.moderationAction.create({
      data: {
        adminId,
        targetUserId,
        action: "EMAIL_VERIFY",
        reason: "Email manually verified by admin.",
        message: "Email verification was approved by an administrator."
      }
    });
    await writeAdminAuditLog({ adminId, actionType: "verify_email", targetUserId, reason: "Manual administrator verification" }, tx);
  });

  return toAdminUserDto(await getAdminUserOrThrow(targetUserId));
}

export async function flagSuspiciousRun(targetUserId: string, reason: string) {
  const cleanReason = reason.trim() || "Suspicious gameplay rejected by server anti-cheat.";
  const endsAt = new Date(Date.now() + 24 * 60 * 60_000);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.moderationAction.create({
      data: {
        targetUserId,
        action: "CHEAT_FLAG",
        reason: cleanReason,
        message: "Suspicious run rejected by server anti-cheat. Gameplay access is temporarily restricted for 24 hours."
      }
    });
    await tx.restriction.create({
      data: {
        userId: targetUserId,
        type: "temporary_ban",
        reason: `Server anti-cheat rejected suspicious gameplay: ${cleanReason}`,
        notes: "Automatic 24-hour restriction after server-side gameplay tampering detection.",
        endsAt
      }
    });
    await writeAdminAuditLog({
      actionType: "ban_user",
      targetUserId,
      reason: cleanReason,
      metadata: { source: "server_anti_cheat", durationHours: 24, endsAt: endsAt.toISOString() }
    }, tx);
  });
}

export async function resetUserPassword(adminId: string, targetUserId: string): Promise<AdminPasswordResetDto> {
  if (adminId === targetUserId) {
    throw new AppError(400, "Use Settings to change your own password.", "SELF_PASSWORD_RESET_BLOCKED");
  }
  await getAdminUserOrThrow(targetUserId);
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const resetAt = new Date();

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash,
        mustChangePassword: true,
        temporaryPasswordUsed: false,
        passwordResetAt: resetAt
      }
    });
    await writeAdminAuditLog({ adminId, actionType: "reset_password", targetUserId, reason: "Temporary password generated" }, tx);
    await writeAdminAuditLog({ adminId, actionType: "force_password_change", targetUserId }, tx);
  });

  return { temporaryPassword, user: toAdminUserDto(await getAdminUserOrThrow(targetUserId)) };
}

export async function listScoresForReview(status: ScoreStatus | "all" = "pending_review"): Promise<ScoreReviewDto[]> {
  const scores = await prisma.score.findMany({
    take: 100,
    where: status === "all" ? undefined : { status },
    orderBy: { createdAt: "desc" },
    include: { user: { include: { profile: true } } }
  });
  const sessionIds = scores.flatMap((score) => score.sessionId ? [score.sessionId] : []);
  const sessions = await prisma.gameSession.findMany({ where: { id: { in: sessionIds } } });
  const sessionMap = new Map(sessions.map((session) => [session.id, session]));

  return scores.map((score) => {
    const session = score.sessionId ? sessionMap.get(score.sessionId) : undefined;
    return {
      id: score.id,
      userId: score.userId,
      displayName: score.user.profile ? getSafeStoredDisplayName(score.user.profile.displayName, score.userId) : `User-${score.userId.slice(0, 6)}`,
      sessionId: score.sessionId,
      score: score.score,
      distance: score.distance,
      durationMs: score.durationMs,
      status: score.status as ScoreStatus,
      reviewReason: score.reviewReason,
      createdAt: score.createdAt.toISOString(),
      session: session ? {
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endedAt?.toISOString() ?? null,
        coinsCollected: session.coinsCollected,
        obstacleHits: session.obstacleHits,
        antiCheatNotes: session.antiCheatNotes
      } : null
    };
  });
}

export async function moderateScore(adminId: string, scoreId: string, status: "valid" | "rejected" | "hidden", reason: string) {
  const score = await prisma.score.findUnique({ where: { id: scoreId } });
  if (!score) throw new AppError(404, "Score not found.", "SCORE_NOT_FOUND");

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.score.update({
      where: { id: scoreId },
      data: { status, reviewReason: reason, reviewedAt: new Date(), reviewedById: adminId }
    });
    if (status === "valid") {
      const profile = await tx.userProfile.findUnique({ where: { userId: score.userId } });
      if (profile && score.score > profile.highScore) {
        await tx.userProfile.update({ where: { userId: score.userId }, data: { highScore: score.score } });
      }
    }
    await writeAdminAuditLog({
      adminId,
      actionType: status === "valid" ? "approve_score" : status === "hidden" ? "hide_score" : "reject_score",
      targetUserId: score.userId,
      targetEntityId: scoreId,
      reason
    }, tx);
  });
  return (await listScoresForReview("all")).find((item) => item.id === scoreId);
}

export async function resetUserScores(adminId: string, targetUserId: string, reason: string) {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.score.updateMany({ where: { userId: targetUserId }, data: { status: "hidden", reviewReason: reason, reviewedAt: new Date(), reviewedById: adminId } });
    await tx.userProfile.update({ where: { userId: targetUserId }, data: { highScore: 0 } });
    await writeAdminAuditLog({ adminId, actionType: "reset_score", targetUserId, reason }, tx);
  });
  return toAdminUserDto(await getAdminUserOrThrow(targetUserId));
}

export async function setUserTrust(adminId: string, targetUserId: string, trustStatus: "TRUSTED" | "SUSPICIOUS" | "NORMAL", reason: string) {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.user.update({ where: { id: targetUserId }, data: { trustStatus } });
    await writeAdminAuditLog({ adminId, actionType: trustStatus === "SUSPICIOUS" ? "mark_suspicious" : "mark_trusted", targetUserId, reason, metadata: { trustStatus } }, tx);
  });
  return toAdminUserDto(await getAdminUserOrThrow(targetUserId));
}

export async function createUserRestriction(adminId: string, targetUserId: string, input: { type: RestrictionType; reason: string; notes?: string; endsAt?: string | null }) {
  const restriction = await prisma.restriction.create({
    data: {
      userId: targetUserId,
      adminId,
      type: input.type,
      reason: input.reason,
      notes: input.notes,
      endsAt: input.endsAt ? new Date(input.endsAt) : null
    }
  });
  await writeAdminAuditLog({ adminId, actionType: "restrict_user", targetUserId, targetEntityId: restriction.id, reason: input.reason, metadata: { type: input.type, endsAt: input.endsAt } });
  return toRestrictionDto({ ...restriction } as AdminUserRow["restrictions"][number]);
}

export async function removeUserRestriction(adminId: string, restrictionId: string, reason: string) {
  const restriction = await prisma.restriction.findUnique({ where: { id: restrictionId } });
  if (!restriction) throw new AppError(404, "Restriction not found.", "RESTRICTION_NOT_FOUND");
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.restriction.update({ where: { id: restrictionId }, data: { active: false } });
    await writeAdminAuditLog({ adminId, actionType: "remove_restriction", targetUserId: restriction.userId, targetEntityId: restrictionId, reason }, tx);
  });
  return { success: true };
}

export async function listAdminAuditLogs(): Promise<AdminAuditLogDto[]> {
  const logs = await prisma.adminAuditLog.findMany({ take: 150, orderBy: { createdAt: "desc" }, include: { admin: { select: { email: true } } } });
  return logs.map((log) => ({
    id: log.id,
    adminId: log.adminId,
    adminEmail: log.admin?.email ?? null,
    actionType: log.actionType,
    targetUserId: log.targetUserId,
    targetEntityId: log.targetEntityId,
    reason: log.reason,
    metadata: log.metadata ? JSON.parse(log.metadata) as Record<string, unknown> : null,
    createdAt: log.createdAt.toISOString()
  }));
}

export async function listFinancialTransactions(): Promise<FinancialTransactionDto[]> {
  const rows = await prisma.purchaseTransaction.findMany({
    take: 150,
    orderBy: { createdAt: "desc" },
    include: {
      user: { include: { profile: true } },
      skin: { select: { id: true, nameKey: true, slug: true } }
    }
  });

  return rows.map((row) => {
    const metadata = parseMetadata(row.metadata);
    const sku = typeof metadata?.sku === "string" ? metadata.sku : null;
    return {
      id: row.id,
      userId: row.userId,
      userEmail: row.user.email,
      displayName: row.user.profile ? getSafeStoredDisplayName(row.user.profile.displayName, row.userId) : `User-${row.userId.slice(0, 6)}`,
      type: row.type,
      status: row.status,
      provider: row.provider,
      productLabel: row.skin?.slug ?? sku ?? row.type,
      skinId: row.skinId,
      skinNameKey: row.skin?.nameKey ?? null,
      amountCoins: row.amountCoins,
      amountGems: row.amountGems,
      amountTickets: row.amountTickets,
      amountExtraLives: row.amountExtraLives,
      idempotencyKey: row.idempotencyKey,
      metadata,
      createdAt: row.createdAt.toISOString()
    };
  });
}

export async function listGuestTransferAttempts() {
  return prisma.guestTransferAttempt.findMany({ take: 100, orderBy: { createdAt: "desc" }, select: { id: true, userId: true, status: true, bestScore: true, transferredScore: true, reason: true, metadata: true, createdAt: true } });
}
