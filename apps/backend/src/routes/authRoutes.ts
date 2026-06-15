import { Router } from "express";
import { login, logout, me, register } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authRateLimit } from "../middleware/security.js";
import { validateBody } from "../middleware/validate.js";
import { loginSchema, registerSchema } from "./schemas.js";

export const authRoutes = Router();

authRoutes.post("/register", authRateLimit, validateBody(registerSchema), asyncHandler(register));
authRoutes.post("/login", authRateLimit, validateBody(loginSchema), asyncHandler(login));
authRoutes.post("/logout", requireAuth, asyncHandler(logout));
authRoutes.get("/me", requireAuth, asyncHandler(me));
