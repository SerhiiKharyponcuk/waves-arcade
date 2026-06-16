import type { Prisma } from "@prisma/client";
import type { SupportTicketCategory, SupportTicketDto, SupportTicketStatus } from "@waves/shared";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";

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
    userEmail: ticket.user.email,
    displayName: ticket.user.profile?.displayName ?? "Player",
    adminEmail: ticket.admin?.email ?? null,
    category: ticket.category as SupportTicketCategory,
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status as SupportTicketStatus,
    adminResponse: ticket.adminResponse,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    closedAt: ticket.closedAt?.toISOString() ?? null
  };
}

export async function createSupportTicket(
  userId: string,
  input: { category: SupportTicketCategory; subject: string; message: string }
): Promise<SupportTicketDto> {
  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      category: input.category,
      subject: input.subject,
      message: input.message,
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

export async function listAdminSupportTickets(status?: string): Promise<SupportTicketDto[]> {
  const tickets = await prisma.supportTicket.findMany({
    where: status && status !== "ALL" ? { status } : undefined,
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
  input: { status?: SupportTicketStatus; adminResponse?: string }
): Promise<SupportTicketDto> {
  const existing = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!existing) {
    throw new AppError(404, "Support ticket not found.", "SUPPORT_TICKET_NOT_FOUND");
  }

  const status = input.status ?? (input.adminResponse ? "ANSWERED" : existing.status);
  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      adminId,
      status,
      adminResponse: input.adminResponse ?? existing.adminResponse,
      closedAt: status === "CLOSED" ? new Date() : null
    },
    include: {
      user: { include: { profile: true } },
      admin: { select: { email: true } }
    }
  });

  return toSupportTicketDto(ticket);
}
