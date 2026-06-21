import { Router } from "express";
import { changePassword, deleteAccount, profile, progression, updateProfile } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { changePasswordSchema, deleteAccountSchema, updateProfileSchema } from "./schemas.js";

export const userRoutes = Router();

userRoutes.get("/profile", requireAuth, asyncHandler(profile));
userRoutes.get("/progression", requireAuth, asyncHandler(progression));
userRoutes.patch("/profile", requireAuth, validateBody(updateProfileSchema), asyncHandler(updateProfile));
userRoutes.post("/password", requireAuth, validateBody(changePasswordSchema), asyncHandler(changePassword));
userRoutes.delete("/account", requireAuth, validateBody(deleteAccountSchema), asyncHandler(deleteAccount));
