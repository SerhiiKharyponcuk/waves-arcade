import type { Request, Response } from "express";
import {
  createPublicSupportTicket,
  createSupportTicket,
  listAdminSupportTickets,
  listMySupportTickets,
  updateSupportTicketByAdmin
} from "../services/supportService.js";
import { AppError } from "../utils/appError.js";

export async function createTicket(request: Request, response: Response) {
  response.status(201).json(await createSupportTicket(request.auth!.userId, request.body));
}

export async function createPublicTicket(request: Request, response: Response) {
  response.status(201).json(await createPublicSupportTicket(request.body));
}

export async function myTickets(request: Request, response: Response) {
  response.json(await listMySupportTickets(request.auth!.userId));
}

export async function adminTickets(request: Request, response: Response) {
  response.json(
    await listAdminSupportTickets(
      String(request.query.status ?? "ALL"),
      String(request.query.source ?? "ALL")
    )
  );
}

export async function adminUpdateTicket(request: Request, response: Response) {
  const ticketId = request.params.ticketId;
  if (!ticketId) {
    throw new AppError(400, "Support ticket is required.", "SUPPORT_TICKET_REQUIRED");
  }

  response.json(await updateSupportTicketByAdmin(request.auth!.userId, ticketId, request.body));
}
