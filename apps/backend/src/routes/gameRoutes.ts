import { Router } from "express";
import { checkpointSession, endSession, leaderboard, startSession, submitScore } from "../controllers/gameController.js";
import { requireAuth } from "../middleware/auth.js";
import { gameCheckpointRateLimit, gameSessionRateLimit } from "../middleware/security.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { gameSessionCheckpointSchema, gameSessionEndSchema, leaderboardQuerySchema } from "./schemas.js";

export const gameRoutes = Router();

gameRoutes.post("/session/start", requireAuth, gameSessionRateLimit, asyncHandler(startSession));
gameRoutes.post("/session/checkpoint", requireAuth, gameCheckpointRateLimit, validateBody(gameSessionCheckpointSchema), asyncHandler(checkpointSession));
gameRoutes.post("/session/end", requireAuth, gameSessionRateLimit, validateBody(gameSessionEndSchema), asyncHandler(endSession));
gameRoutes.post("/score", requireAuth, gameSessionRateLimit, validateBody(gameSessionEndSchema), asyncHandler(submitScore));
gameRoutes.get("/leaderboard", requireAuth, validateQuery(leaderboardQuerySchema), asyncHandler(leaderboard));
