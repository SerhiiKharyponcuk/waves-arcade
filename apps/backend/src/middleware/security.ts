import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

const allowedOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const corsMiddleware = cors({
  origin: allowedOrigins.length > 1 ? allowedOrigins : allowedOrigins[0],
  credentials: true
});

export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.NODE_ENV === "production" ? 120 : 500,
  standardHeaders: true,
  legacyHeaders: false
});

export const authRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.NODE_ENV === "production" ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts. Please try again soon.", code: "RATE_LIMITED" }
});

export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60_000,
  max: env.NODE_ENV === "production" ? 3 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many accounts created from this network. Please try again later.", code: "REGISTRATION_RATE_LIMITED" }
});

export const passwordRecoveryRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: env.NODE_ENV === "production" ? 5 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password recovery attempts. Please try again later.", code: "PASSWORD_RATE_LIMITED" }
});

export const supportRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.NODE_ENV === "production" ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many support requests. Please wait a minute.", code: "SUPPORT_RATE_LIMITED" }
});

export const gameCheckpointRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.NODE_ENV === "production" ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many game checkpoints.", code: "GAME_RATE_LIMITED" }
});
