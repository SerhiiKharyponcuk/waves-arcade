import { Router } from "express";
import { adminBanUser, adminThankUser, adminUnbanUser, adminUsers } from "../controllers/adminController.js";
import { adminTickets, adminUpdateTicket } from "../controllers/supportController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { adminBanSchema, adminSupportTicketSchema, adminThankSchema } from "./schemas.js";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireAdmin);
adminRoutes.get("/users", asyncHandler(adminUsers));
adminRoutes.post("/users/:userId/ban", validateBody(adminBanSchema), asyncHandler(adminBanUser));
adminRoutes.post("/users/:userId/unban", validateBody(adminBanSchema.partial()), asyncHandler(adminUnbanUser));
adminRoutes.post("/users/:userId/thank", validateBody(adminThankSchema), asyncHandler(adminThankUser));
adminRoutes.get("/support/tickets", asyncHandler(adminTickets));
adminRoutes.patch("/support/tickets/:ticketId", validateBody(adminSupportTicketSchema), asyncHandler(adminUpdateTicket));
