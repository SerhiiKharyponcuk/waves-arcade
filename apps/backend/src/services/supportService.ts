import type { Prisma } from "@prisma/client";
import type { SupportTicketCategory, SupportTicketDto, SupportTicketStatus } from "@waves/shared";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { writeAdminAuditLog } from "./auditService.js";

const blockedSupportTerms = [
  "fuck",
  "shit",
  "bitch",
  "idiot",
  "сука",
  "бля",
  "дебил",
  "ідіот",
  "лох"
];

const exposedPasswordPattern = /(password|пароль|wachtwoord)\s*[:=]\s*\S{4,}/iu;

function validateSupportMessage(subject: string, message: string) {
  const normalizedText = `${subject} ${message}`.toLowerCase();
  if (blockedSupportTerms.some((term) => normalizedText.includes(term))) {
    throw new AppError(400, "Support messages must be respectful.", "ABUSIVE_SUPPORT_MESSAGE");
  }
  if (exposedPasswordPattern.test(message)) {
    throw new AppError(400, "Remove your password from the message. Support will never ask for it.", "PASSWORD_EXPOSED");
  }
}

type SupportTicketRow = Prisma.SupportTicketGetPayload<{
  include: {
    user: { include: { profile: true } };
    admin: { select: { email: true } };
  };
}>;

function toSupportTicketDto(ticket: SupportTicketRow): SupportTicketDto {
  return {
    id: ticket.id,
    userId: ticket.userId,
    userEmail: ticket.user?.email ?? ticket.contactEmail ?? undefined,
    displayName: ticket.user?.profile?.displayName ?? ticket.contactName ?? "Guest",
    source: ticket.userId ? "ACCOUNT" : "GUEST",
    adminEmail: ticket.admin?.email ?? null,
    category: ticket.category as SupportTicketCategory,
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status as SupportTicketStatus,
    adminResponse: ticket.adminResponse,
    relatedEntityId: ticket.relatedEntityId,
    internalNote: ticket.internalNote,
    appealStatus: ticket.appealStatus,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    closedAt: ticket.closedAt?.toISOString() ?? null
  };
}

export async function createSupportTicket(
  userId: string,
  input: { category: SupportTicketCategory; subject: string; message: string; relatedEntityId?: string }
): Promise<SupportTicketDto> {
  validateSupportMessage(input.subject, input.message);

  const account = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true }
  });
  if (!account) {
    throw new AppError(404, "User not found.", "USER_NOT_FOUND");
  }
  const supportRestriction = await prisma.restriction.findFirst({
    where: { userId, active: true, type: "support_restriction", OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }
  });
  if (supportRestriction) {
    throw new AppError(403, `Support access is restricted: ${supportRestriction.reason}. You may submit an appeal by email.`, "SUPPORT_RESTRICTED");
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      contactEmail: account.email,
      contactName: account.profile?.displayName ?? null,
      category: input.category,
      subject: input.subject,
      message: input.message,
      relatedEntityId: input.relatedEntityId,
      appealStatus: input.category === "APPEAL" || input.category === "BAN_APPEAL" ? "UNDER_REVIEW" : null,
      status: "OPEN"
    },
    include: {
      user: { include: { profile: true } },
      admin: { select: { email: true } }
    }
  });

  return toSupportTicketDto(ticket);
}

export async function createPublicSupportTicket(input: {
  email: string;
  displayName?: string;
  category: SupportTicketCategory;
  subject: string;
  message: string;
  relatedEntityId?: string;
}): Promise<SupportTicketDto> {
  validateSupportMessage(input.subject, input.message);

  const ticket = await prisma.supportTicket.create({
    data: {
      contactEmail: input.email.toLowerCase(),
      contactName: input.displayName?.trim() || "Guest",
      category: input.category,
      subject: input.subject,
      message: input.message,
      relatedEntityId: input.relatedEntityId,
      appealStatus: input.category === "APPEAL" || input.category === "BAN_APPEAL" ? "UNDER_REVIEW" : null,
      status: "OPEN"
    },
    include: {
      user: { include: { profile: true } },
      admin: { select: { email: true } }
    }
  });

  return toSupportTicketDto(ticket);
}

export async function listMySupportTickets(userId: string): Promise<SupportTicketDto[]> {
  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    take: 30,
    orderBy: { createdAt: "desc" },
    include: {
      user: { include: { profile: true } },
      admin: { select: { email: true } }
    }
  });

  return tickets.map(toSupportTicketDto);
}

export async function listAdminSupportTickets(status?: string, source?: string): Promise<SupportTicketDto[]> {
  const tickets = await prisma.supportTicket.findMany({
    where: {
      ...(status && status !== "ALL" ? { status } : {}),
      ...(source === "GUEST" ? { userId: null } : source === "ACCOUNT" ? { userId: { not: null } } : {})
    },
    take: 80,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      user: { include: { profile: true } },
      admin: { select: { email: true } }
    }
  });

  return tickets.map(toSupportTicketDto);
}

export async function updateSupportTicketByAdmin(
  adminId: string,
  ticketId: string,
  input: { status?: SupportTicketStatus; adminResponse?: string; internalNote?: string; appealStatus?: string }
): Promise<SupportTicketDto> {
  const existing = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!existing) {
    throw new AppError(404, "Support ticket not found.", "SUPPORT_TICKET_NOT_FOUND");
  }

  const status = input.adminResponse ? "CLOSED" : input.status ?? existing.status;
  const ticket = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.supportTicket.update({
      where: { id: ticketId },
      data: {
        adminId,
        status,
        adminResponse: input.adminResponse ?? existing.adminResponse,
        internalNote: input.internalNote ?? existing.internalNote,
        appealStatus: input.appealStatus ?? existing.appealStatus,
        closedAt: status === "CLOSED" ? new Date() : null
      },
      include: {
        user: { include: { profile: true } },
        admin: { select: { email: true } }
      }
    });
    if (status === "CLOSED") {
      await writeAdminAuditLog({ adminId, actionType: "close_support_ticket", targetUserId: existing.userId, targetEntityId: ticketId, reason: input.adminResponse ? "Answered and closed" : "Closed by admin" }, tx);
    }
    if (existing.relatedEntityId && input.appealStatus === "REMOVED") {
      const restriction = await tx.restriction.findUnique({ where: { id: existing.relatedEntityId } });
      if (restriction) {
        await tx.restriction.update({ where: { id: restriction.id }, data: { active: false } });
        await writeAdminAuditLog({ adminId, actionType: "remove_restriction", targetUserId: restriction.userId, targetEntityId: restriction.id, reason: "Appeal approved" }, tx);
      }
    }
    if (existing.relatedEntityId && input.appealStatus === "RESTORED") {
      const score = await tx.score.findUnique({ where: { id: existing.relatedEntityId } });
      if (score) {
        await tx.score.update({ where: { id: score.id }, data: { status: "valid", reviewedAt: new Date(), reviewedById: adminId, reviewReason: "Restored after appeal" } });
        await writeAdminAuditLog({ adminId, actionType: "approve_score", targetUserId: score.userId, targetEntityId: score.id, reason: "Appeal approved" }, tx);
      }
    }
    return updated;
  });

  return toSupportTicketDto(ticket);
}
