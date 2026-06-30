import { Router } from "express";
import {
  adminAnalytics,
  adminBanUser,
  adminAuditLogs,
  adminFinancialTransactions,
  adminGuestTransfers,
  adminModerateScore,
  adminRemoveRestriction,
  adminResetPassword,
  adminResetScores,
  adminRestrictUser,
  adminScores,
  adminSetTrust,
  adminResendEmailVerification,
  adminThankUser,
  adminUnbanUser,
  adminUsers,
  adminVerifyUserEmail
} from "../controllers/adminController.js";
import { adminTickets, adminUpdateTicket } from "../controllers/supportController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { adminRateLimit } from "../middleware/security.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  adminBanSchema,
  adminRestrictionSchema,
  adminScoreModerationSchema,
  adminScoreQuerySchema,
  adminSupportTicketSchema,
  adminSupportTicketsQuerySchema,
  adminThankSchema,
  adminTrustSchema,
  adminUserSearchQuerySchema
} from "./schemas.js";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireAdmin, adminRateLimit);
adminRoutes.get("/users", validateQuery(adminUserSearchQuerySchema), asyncHandler(adminUsers));
adminRoutes.get("/analytics", asyncHandler(adminAnalytics));
adminRoutes.post("/users/:userId/ban", validateBody(adminBanSchema), asyncHandler(adminBanUser));
adminRoutes.post("/users/:userId/unban", validateBody(adminBanSchema.partial()), asyncHandler(adminUnbanUser));
adminRoutes.post("/users/:userId/thank", validateBody(adminThankSchema), asyncHandler(adminThankUser));
adminRoutes.post("/users/:userId/email-verification/resend", asyncHandler(adminResendEmailVerification));
adminRoutes.post("/users/:userId/email-verification/approve", asyncHandler(adminVerifyUserEmail));
adminRoutes.post("/users/:userId/reset-password", asyncHandler(adminResetPassword));
adminRoutes.post("/users/:userId/reset-scores", validateBody(adminBanSchema), asyncHandler(adminResetScores));
adminRoutes.post("/users/:userId/trust", validateBody(adminTrustSchema), asyncHandler(adminSetTrust));
adminRoutes.post("/users/:userId/restrictions", validateBody(adminRestrictionSchema), asyncHandler(adminRestrictUser));
adminRoutes.delete("/restrictions/:restrictionId", validateBody(adminBanSchema), asyncHandler(adminRemoveRestriction));
adminRoutes.get("/scores", validateQuery(adminScoreQuerySchema), asyncHandler(adminScores));
adminRoutes.patch("/scores/:scoreId", validateBody(adminScoreModerationSchema), asyncHandler(adminModerateScore));
adminRoutes.get("/financial-transactions", asyncHandler(adminFinancialTransactions));
adminRoutes.get("/audit-logs", asyncHandler(adminAuditLogs));
adminRoutes.get("/guest-transfers", asyncHandler(adminGuestTransfers));
adminRoutes.get("/support/tickets", validateQuery(adminSupportTicketsQuerySchema), asyncHandler(adminTickets));
adminRoutes.patch("/support/tickets/:ticketId", validateBody(adminSupportTicketSchema), asyncHandler(adminUpdateTicket));
