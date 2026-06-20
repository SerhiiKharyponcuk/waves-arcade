import { Router } from "express";
import { createPublicTicket, createTicket, myTickets } from "../controllers/supportController.js";
import { requireAuth } from "../middleware/auth.js";
import { supportRateLimit } from "../middleware/security.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { publicSupportTicketSchema, supportTicketSchema } from "./schemas.js";

export const supportRoutes = Router();

supportRoutes.post("/public", supportRateLimit, validateBody(publicSupportTicketSchema), asyncHandler(createPublicTicket));
supportRoutes.use(requireAuth);
supportRoutes.get("/tickets", asyncHandler(myTickets));
supportRoutes.post("/tickets", supportRateLimit, validateBody(supportTicketSchema), asyncHandler(createTicket));
