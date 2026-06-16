import type { AdminUserDto, ModerationActionDto } from "@waves/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";

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
    displayName: user.profile?.displayName ?? "Player",
    highScore: user.profile?.highScore ?? 0,
    coins: user.wallet?.coins ?? 0,
    createdAt: user.createdAt.toISOString(),
    bannedAt: user.bannedAt?.toISOString() ?? null,
    banReason: user.banReason,
    lastAction: user.receivedActions[0] ? toModerationActionDto(user.receivedActions[0]) : null
  };
}

async function getAdminUserOrThrow(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      wallet: true,
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

export async function flagSuspiciousRun(targetUserId: string, reason: string) {
  await prisma.moderationAction.create({
    data: {
      targetUserId,
      action: "CHEAT_FLAG",
      reason,
      message: "Suspicious run rejected by server anti-cheat."
    }
  });
}
