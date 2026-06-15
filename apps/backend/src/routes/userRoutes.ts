import { Router } from "express";
import { profile, updateProfile } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { updateProfileSchema } from "./schemas.js";

export const userRoutes = Router();

userRoutes.get("/profile", requireAuth, asyncHandler(profile));
userRoutes.patch("/profile", requireAuth, validateBody(updateProfileSchema), asyncHandler(updateProfile));
