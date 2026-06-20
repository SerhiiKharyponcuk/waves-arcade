import type { SupportTicketCategory, SupportTicketDto, SupportTicketSource, SupportTicketStatus } from "../types/api";
import { apiRequest } from "./apiClient";

export const supportApi = {
  myTickets() {
    return apiRequest<SupportTicketDto[]>("/support/tickets");
  },
  createTicket(payload: { category: SupportTicketCategory; subject: string; message: string; relatedEntityId?: string; website?: string; formStartedAt?: number }) {
    return apiRequest<SupportTicketDto>("/support/tickets", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  createPublicTicket(payload: {
    email: string;
    displayName?: string;
    category: SupportTicketCategory;
    subject: string;
    message: string;
    relatedEntityId?: string;
    website?: string;
    formStartedAt?: number;
  }) {
    return apiRequest<SupportTicketDto>("/support/public", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  adminTickets(status: SupportTicketStatus | "ALL" = "ALL", source: SupportTicketSource | "ALL" = "ALL") {
    return apiRequest<SupportTicketDto[]>(
      `/admin/support/tickets?status=${encodeURIComponent(status)}&source=${encodeURIComponent(source)}`
    );
  },
  adminUpdateTicket(ticketId: string, payload: { status?: SupportTicketStatus; adminResponse?: string; internalNote?: string; appealStatus?: string }) {
    return apiRequest<SupportTicketDto>(`/admin/support/tickets/${ticketId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }
};
