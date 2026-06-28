import { Router } from "express";
import { createAnalyticsEvent } from "../controllers/analyticsController.js";
import { optionalAuth } from "../middleware/auth.js";
import { analyticsRateLimit } from "../middleware/security.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { analyticsEventSchema } from "./schemas.js";

export const analyticsRoutes = Router();
analyticsRoutes.post("/events", analyticsRateLimit, optionalAuth, validateBody(analyticsEventSchema), asyncHandler(createAnalyticsEvent));
