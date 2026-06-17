import { Router } from "express";
import { createTicket, myTickets } from "../controllers/supportController.js";
import { requireAuth } from "../middleware/auth.js";
import { supportRateLimit } from "../middleware/security.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { supportTicketSchema } from "./schemas.js";

export const supportRoutes = Router();

supportRoutes.use(requireAuth);
supportRoutes.get("/tickets", asyncHandler(myTickets));
supportRoutes.post("/tickets", supportRateLimit, validateBody(supportTicketSchema), asyncHandler(createTicket));
