import { Router } from "express";
import { endSession, leaderboard, startSession, submitScore } from "../controllers/gameController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { gameSessionEndSchema } from "./schemas.js";

export const gameRoutes = Router();

gameRoutes.post("/session/start", requireAuth, asyncHandler(startSession));
gameRoutes.post("/session/end", requireAuth, validateBody(gameSessionEndSchema), asyncHandler(endSession));
gameRoutes.post("/score", requireAuth, validateBody(gameSessionEndSchema), asyncHandler(submitScore));
gameRoutes.get("/leaderboard", requireAuth, asyncHandler(leaderboard));
