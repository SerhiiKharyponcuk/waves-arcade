import type { SupportTicketCategory, SupportTicketDto, SupportTicketStatus } from "../types/api";
import { apiRequest } from "./apiClient";

export const supportApi = {
  myTickets() {
    return apiRequest<SupportTicketDto[]>("/support/tickets");
  },
  createTicket(payload: { category: SupportTicketCategory; subject: string; message: string; website?: string; formStartedAt?: number }) {
    return apiRequest<SupportTicketDto>("/support/tickets", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  adminTickets(status: SupportTicketStatus | "ALL" = "ALL") {
    return apiRequest<SupportTicketDto[]>(`/admin/support/tickets?status=${encodeURIComponent(status)}`);
  },
  adminUpdateTicket(ticketId: string, payload: { status?: SupportTicketStatus; adminResponse?: string }) {
    return apiRequest<SupportTicketDto>(`/admin/support/tickets/${ticketId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }
};
