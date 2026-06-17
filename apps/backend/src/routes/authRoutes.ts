import { Router } from "express";
import { forgotPassword, login, logout, me, register, resendVerification, resetPasswordController, verifyEmail } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authRateLimit } from "../middleware/security.js";
import { validateBody } from "../middleware/validate.js";
import { forgotPasswordSchema, loginSchema, registerSchema, resendVerificationSchema, resetPasswordSchema, verifyEmailSchema } from "./schemas.js";

export const authRoutes = Router();

authRoutes.post("/register", authRateLimit, validateBody(registerSchema), asyncHandler(register));
authRoutes.post("/login", authRateLimit, validateBody(loginSchema), asyncHandler(login));
authRoutes.post("/forgot-password", authRateLimit, validateBody(forgotPasswordSchema), asyncHandler(forgotPassword));
authRoutes.post("/reset-password", authRateLimit, validateBody(resetPasswordSchema), asyncHandler(resetPasswordController));
authRoutes.post("/verify-email", authRateLimit, validateBody(verifyEmailSchema), asyncHandler(verifyEmail));
authRoutes.post("/resend-verification", authRateLimit, validateBody(resendVerificationSchema), asyncHandler(resendVerification));
authRoutes.post("/logout", requireAuth, asyncHandler(logout));
authRoutes.get("/me", requireAuth, asyncHandler(me));
