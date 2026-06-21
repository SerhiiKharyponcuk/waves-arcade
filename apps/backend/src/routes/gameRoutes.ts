import { Router } from "express";
import { checkpointSession, endSession, leaderboard, startSession, submitScore } from "../controllers/gameController.js";
import { requireAuth } from "../middleware/auth.js";
import { gameCheckpointRateLimit } from "../middleware/security.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { gameSessionCheckpointSchema, gameSessionEndSchema } from "./schemas.js";

export const gameRoutes = Router();

gameRoutes.post("/session/start", requireAuth, asyncHandler(startSession));
gameRoutes.post("/session/checkpoint", requireAuth, gameCheckpointRateLimit, validateBody(gameSessionCheckpointSchema), asyncHandler(checkpointSession));
gameRoutes.post("/session/end", requireAuth, validateBody(gameSessionEndSchema), asyncHandler(endSession));
gameRoutes.post("/score", requireAuth, validateBody(gameSessionEndSchema), asyncHandler(submitScore));
gameRoutes.get("/leaderboard", requireAuth, asyncHandler(leaderboard));
